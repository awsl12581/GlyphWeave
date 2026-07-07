//! Cursor -> tile coordinate. Updates CursorTile for UI and tool use.
use crate::resource::{CursorTile, WorldModel};
use bevy::prelude::*;

/// Pure: convert Bevy world coordinates to GlyphWeave tile coordinates.
pub fn tile_from_world_pos(world: Vec2, tile_size: u32) -> (i32, i32) {
    let tile_px = tile_size.max(1) as f32;
    (
        (world.x / tile_px).floor() as i32,
        (-world.y / tile_px).floor() as i32,
    )
}

pub fn update_cursor_tile(
    camera_q: Single<(&Camera, &GlobalTransform)>,
    window: Single<&Window>,
    world_model: Res<WorldModel>,
    mut cursor: ResMut<CursorTile>,
) {
    let (cam, gtf) = *camera_q;
    let Some(p) = window.cursor_position() else {
        cursor.valid = false;
        return;
    };
    let Ok(world) = cam.viewport_to_world_2d(gtf, p) else {
        cursor.valid = false;
        return;
    };
    let (tx, ty) = tile_from_world_pos(world, world_model.tile_size);
    cursor.x = tx;
    cursor.y = ty;
    cursor.valid = true;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tile_from_world_pos_matches_canvas_orientation() {
        assert_eq!(tile_from_world_pos(Vec2::new(0.0, 0.0), 24), (0, 0));
        assert_eq!(tile_from_world_pos(Vec2::new(25.0, -49.0), 24), (1, 2));
        assert_eq!(tile_from_world_pos(Vec2::new(-1.0, 1.0), 24), (-1, -1));
    }
}
