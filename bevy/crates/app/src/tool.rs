//! Tool system: left-drag paints, B selects brush, E selects erase.
//! Produces EditEvents + applies edits to the core World (single source of truth).
use crate::resource::{CursorTile, EditEvent, WorldModel};
use crate::ActiveBrush;
use bevy::ecs::message::MessageWriter;
use bevy::prelude::*;
use glyphweave_core::edit::Edit;
use glyphweave_core::tile::TileKind;

pub fn tool_system(
    buttons: Res<ButtonInput<MouseButton>>,
    keys: Res<ButtonInput<KeyCode>>,
    mut writer: MessageWriter<EditEvent>,
    mut world: ResMut<WorldModel>,
    mut active_brush: ResMut<ActiveBrush>,
    cursor: Res<CursorTile>,
) {
    if keys.just_pressed(KeyCode::KeyB) {
        active_brush.0 = TileKind::Floor;
    }
    if keys.just_pressed(KeyCode::KeyE) {
        active_brush.0 = TileKind::Void;
    }

    if !buttons.pressed(MouseButton::Left) || !cursor.valid {
        return;
    }

    // Honor the locked flag on the active layer.
    let active_locked = world
        .layer(&world.active_layer)
        .map(|l| l.locked)
        .unwrap_or(false);
    if active_locked {
        return;
    }

    let active_layer = world.active_layer.clone();
    let edit = if matches!(active_brush.0, TileKind::Void) {
        Edit::Erase
    } else {
        Edit::Set(active_brush.0)
    };

    edit.apply(&mut world.0, &active_layer, cursor.x, cursor.y);
    writer.write(EditEvent {
        x: cursor.x,
        y: cursor.y,
        edit,
    });
}
