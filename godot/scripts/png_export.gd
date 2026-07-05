extends RefCounted
## PngExport — Renders the current map to an Image and saves as PNG.
## Replaces server/map-render.mjs

const MAX_OUTPUT_SIZE := 4096
const TILE_SIZE := 24


static func render_to_image(map_data) -> Image:
	return _render(map_data, "ansi-16", 1, null)


static func render_to_image_with_options(map_data, theme_id: String, padding: int, scale_px) -> Image:
	return _render(map_data, theme_id, padding, scale_px)


static func _render(map_data, theme_id: String, padding: int, explicit_scale) -> Image:
	var theme_res := load("res://resources/themes/" + theme_id.replace("-", "_") + ".tres")
	var tile_defs := load("res://resources/tile_types.gd")

	# Flatten all layers
	var flat_tiles := _flatten_tiles(map_data)
	var b := _compute_bounds(flat_tiles)

	var tile_w := b.w
	var tile_h := b.h
	var content_w := tile_w * TILE_SIZE
	var content_h := tile_h * TILE_SIZE
	var pad_px := padding * TILE_SIZE

	var scale: float
	if explicit_scale:
		scale = explicit_scale / float(TILE_SIZE)
	else:
		var max_dim := MAX_OUTPUT_SIZE - pad_px * 2
		var sx: float = float(max_dim) / float(content_w) if content_w > 0 else 1.0
		var sy: float = float(max_dim) / float(content_h) if content_h > 0 else 1.0
		scale = minf(1.0, minf(sx, sy))

	var canvas_w := ceili(content_w * scale + pad_px * 2)
	var canvas_h := ceili(content_h * scale + pad_px * 2)

	var img := Image.create(canvas_w, canvas_h, false, Image.FORMAT_RGBA8)
	img.fill(Color.BLACK)

	var ox: float = (canvas_w - content_w * scale) / 2.0
	var oy: float = (canvas_h - content_h * scale) / 2.0

	for k in flat_tiles:
		var tile_id: String = flat_tiles[k]
		if tile_id == "" or tile_id == "void":
			continue
		var colors := {}
		if theme_res:
			colors = theme_res.get_colors(tile_id)

		var parts := k.split(",")
		var x := int(parts[0]) - b.minX
		var y := int(parts[1]) - b.minY

		var px := int(ox + x * TILE_SIZE * scale)
		var py := int(oy + y * TILE_SIZE * scale)
		var ts := maxi(ceili(TILE_SIZE * scale + 0.5), 1)

		# Background
		img.fill_rect(Rect2i(px, py, ts, ts), Color(colors.get("bgColor", "#000000")))

	return img


static func _flatten_tiles(map_data) -> Dictionary:
	var result: Dictionary = {}
	for layer in map_data.layers:
		var lt := map_data.tiles.get(layer.id, {})
		if layer.visible:
			for k in lt:
				var tid = lt[k]
				if tid and tid != "":
					result[k] = tid
	return result


static func _compute_bounds(tiles: Dictionary) -> Dictionary:
	var min_x := 0; var min_y := 0; var max_x := 0; var max_y := 0
	var has_tiles := false
	for k in tiles:
		var tid = tiles[k]
		if not tid or tid == "":
			continue
		var parts := k.split(",")
		var x := int(parts[0]); var y := int(parts[1])
		if not has_tiles:
			min_x = x; min_y = y; max_x = x; max_y = y
			has_tiles = true
		else:
			min_x = mini(min_x, x); min_y = mini(min_y, y)
			max_x = maxi(max_x, x); max_y = maxi(max_y, y)
	if not has_tiles:
		return {"minX": 0, "minY": 0, "maxX": 0, "maxY": 0, "w": 1, "h": 1}
	return {"minX": min_x, "minY": min_y, "maxX": max_x, "maxY": max_y, "w": max_x - min_x + 1, "h": max_y - min_y + 1}
