//! Consume EditEvent messages and update the touched tile's texture index.
//! In P1 the tool system applies the edit to the core World (source of truth)
//! AND emits the event; this system only mirrors the change into the render view.
use crate::render::atlas::tile_index;
use crate::render::tilemap::TileEntities;
use crate::resource::{EditEvent, WorldModel};
use bevy::ecs::message::MessageReader;
use bevy::prelude::*;
use bevy_ecs_tilemap::prelude::*;
use glyphweave_core::tile::TileKind;

pub fn sync_edits(
    mut reader: MessageReader<EditEvent>,
    world_model: Res<WorldModel>,
    tile_entities: Res<TileEntities>,
    mut tiles: Query<&mut TileTextureIndex>,
) {
    // P1 edits the active layer; find its index in the spawn order.
    let active_index = world_model
        .layers
        .iter()
        .position(|l| l.id == world_model.active_layer)
        .unwrap_or(0);

    for ev in reader.read() {
        let Some(&entity) = tile_entities.map.get(&(active_index, ev.x, ev.y)) else {
            continue;
        };
        let Ok(mut tex) = tiles.get_mut(entity) else {
            continue;
        };
        match ev.edit {
            glyphweave_core::edit::Edit::Set(kind) => {
                tex.0 = tile_index(kind);
            }
            glyphweave_core::edit::Edit::Erase => {
                tex.0 = tile_index(TileKind::Void);
            }
        }
    }
}
