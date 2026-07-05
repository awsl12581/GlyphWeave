extends Control
## Minimap — Real-time minimap with viewport rectangle indicator.
## Replaces src/components/canvas/Minimap.tsx

const WIDTH := 200.0
const HEIGHT := 140.0

var _base_image: Image
var _base_texture: ImageTexture


func _ready() -> void:
	MapData.tiles_changed.connect(_rebuild_base)
	MapData.layers_changed.connect(_rebuild_base)
	MapData.theme_changed.connect(_rebuild_base)
	MapData.world_initialized.connect(_rebuild_base)
	custom_minimum_size = Vector2(WIDTH, HEIGHT)
	_rebuild_base()


func _rebuild_base() -> void:
	var b := MapData.compute_bounds()
	if b.w <= 1 and b.h <= 1:
		_base_texture = null
		queue_redraw()
		return

	var ts := float(MapData.tile_size)
	var scale_x := WIDTH / (b.w * ts)
	var scale_y := HEIGHT / (b.h * ts)
	var scale := minf(scale_x, scale_y)

	var img := Image.create(int(WIDTH), int(HEIGHT), false, Image.FORMAT_RGBA8)
	img.fill(Color(0.0588, 0.0588, 0.0588))

	var theme_res := _load_theme()

	# Draw from bottom layer to top
	for li in range(MapData.layers.size()):
		var layer := MapData.layers[li]
		if not layer.visible:
			continue
		var lt := MapData.tiles.get(layer.id, {})
		if lt.is_empty():
			continue

		for k in lt:
			var tile_id: String = lt[k]
			if tile_id == "" or tile_id == "void":
				continue
			var parts := k.split(",")
			var x := int(parts[0]) - b.minX
			var y := int(parts[1]) - b.minY

			var colors := {}
			if theme_res:
				colors = theme_res.get_colors(tile_id)
			var color := Color(colors.get("bgColor", "#000000"))

			var rx := int(x * ts * scale)
			var ry := int(y * ts * scale)
			var rw := maxi(int(ts * scale) + 1, 1)
			var rh := maxi(int(ts * scale) + 1, 1)

			img.fill_rect(Rect2i(rx, ry, rw, rh), color)

	_base_image = img
	_base_texture = ImageTexture.create_from_image(_base_image)
	queue_redraw()


func _draw() -> void:
	if not _base_texture:
		return
	draw_texture(_base_texture, Vector2.ZERO)


func _load_theme() -> Resource:
	var path := "res://resources/themes/" + MapData.theme_id.replace("-", "_") + ".tres"
	return load(path)
