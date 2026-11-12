"""Декодирует основной кадр HEIC/HEIF в PNG для sharp.

libheif уже применяет поворот и отражение из контейнера HEIF (irot/imir).
Метка EXIF Orientation для HEIF справочная и второй раз не поворачивает кадр.
У части селфи iPhone после этого остаётся только горизонтальное зеркало
(метки 2, 5 и 7). Его снимаем один раз. Метки чистого поворота (3, 6, 8) не трогаем.

Цвет: профиль ICC переводится в sRGB через Little CMS. Профиль не выбрасывается.
Временный файл — PNG, без второго сжатия с потерями. Миниатюра, карта глубины
и карта усиления HDR не декодируются.
"""

import json
import sys
from io import BytesIO

from PIL import Image, ImageCms
from pillow_heif import open_heif

MIRROR_HORIZONTAL = {2, 5, 7}
MIRROR_VERTICAL = {4}


def exif_datetime(image):
    try:
        exif = image.getexif()
    except Exception:
        return ""
    raw = exif.get(36867) or exif.get(306) or ""
    if isinstance(raw, bytes):
        raw = raw.decode("ascii", "ignore")
    raw = str(raw).strip().strip("\x00")
    if len(raw) >= 19 and raw[4] == ":" and raw[7] == ":":
        return f"{raw[0:4]}-{raw[5:7]}-{raw[8:10]}{raw[10:19]}"
    return ""


def fail(message):
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    return 1


def decode(src, dest):
    heif = open_heif(src, convert_hdr_to_8bit=False)
    images = list(heif)
    if not images:
        raise RuntimeError("heic_decode_failed:в файле нет изображения")
    primary_ones = [img for img in images if img.info.get("primary")]
    primary = primary_ones[0] if primary_ones else max(images, key=lambda img: img.size[0] * img.size[1])
    info = primary.info
    bit_depth = int(info.get("bit_depth") or 8)
    if bit_depth > 8:
        raise RuntimeError(f"heic_hdr_needs_review:bit_depth={bit_depth}")
    thumbs = [int(size) for size in (info.get("thumbnails") or [])]
    if thumbs and max(primary.size) <= max(thumbs):
        raise RuntimeError("heic_decode_failed:основным оказалась миниатюра")

    pil = primary.to_pillow()
    original_orientation = pil.info.get("original_orientation")
    if pil.mode not in ("RGB", "RGBA"):
        pil = pil.convert("RGBA" if "A" in pil.mode else "RGB")

    icc = info.get("icc_profile") or b""
    icc_description = ""
    if icc:
        profile = ImageCms.ImageCmsProfile(BytesIO(icc))
        icc_description = ImageCms.getProfileDescription(profile).replace("\x00", "").strip()
        srgb = ImageCms.createProfile("sRGB")
        converted = ImageCms.profileToProfile(
            pil,
            profile,
            srgb,
            outputMode="RGB" if pil.mode == "RGB" else "RGBA",
            renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC,
        )
        color_conversion = "icc_to_srgb"
        srgb_bytes = ImageCms.ImageCmsProfile(srgb).tobytes()
    else:
        converted = pil
        color_conversion = "no_profile"
        srgb_bytes = b""

    mirror = ""
    if original_orientation in MIRROR_HORIZONTAL:
        converted = converted.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        mirror = "horizontal"
    elif original_orientation in MIRROR_VERTICAL:
        converted = converted.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        mirror = "vertical"

    save_kwargs = {"format": "PNG", "compress_level": 1}
    if srgb_bytes:
        save_kwargs["icc_profile"] = srgb_bytes
    converted.save(dest, **save_kwargs)

    aux = info.get("aux") or {}
    aux_types = sorted(aux.keys()) if isinstance(aux, dict) else []
    return {
        "ok": True,
        "width": converted.size[0],
        "height": converted.size[1],
        "mode": converted.mode,
        "bit_depth": bit_depth,
        "exif_orientation": int(original_orientation) if original_orientation else 1,
        "mirror": mirror,
        "exif_datetime": exif_datetime(pil),
        "color_in": icc_description,
        "color_conversion": color_conversion,
        "hdr_gain_map": any("hdrgainmap" in item for item in aux_types),
        "depth_images": len(info.get("depth_images") or []),
        "thumbnails": thumbs,
        "content_light_level": bool(info.get("content_light_level")),
        "images_in_file": len(images),
        "primary": bool(info.get("primary", True)),
        "aux_types": aux_types,
    }


def main():
    if len(sys.argv) != 3:
        return fail("heic_decode_failed:нужны пути исходника и png")
    try:
        print(json.dumps(decode(sys.argv[1], sys.argv[2]), ensure_ascii=False))
        return 0
    except Exception as exc:
        message = str(exc).strip() or exc.__class__.__name__
        if not message.startswith("heic_"):
            message = f"heic_decode_failed:{message}"
        return fail(message)


if __name__ == "__main__":
    sys.exit(main())
