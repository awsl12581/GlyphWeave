//! egui overlay: FPS, cursor tile coords, world info, Save button.
use crate::render::MapBounds;
use crate::resource::{CursorTile, WorldModel};
use bevy::diagnostic::DiagnosticsStore;
use bevy::prelude::*;
use bevy_egui::{egui, EguiContexts};
use glyphweave_core::gemap::save_world;
use std::path::PathBuf;

/// Where the most recent load came from / where Save writes.
#[derive(Resource, Debug, Clone, Default)]
pub struct CurrentMapPath(pub Option<PathBuf>);

pub fn ui_overlay(
    mut contexts: EguiContexts,
    diagnostics: Res<DiagnosticsStore>,
    cursor: Res<CursorTile>,
    world_model: Res<WorldModel>,
    bounds: Option<Res<MapBounds>>,
    path: Res<CurrentMapPath>,
) {
    let fps = diagnostics
        .get(&bevy::diagnostic::FrameTimeDiagnosticsPlugin::FPS)
        .and_then(|d| d.smoothed())
        .map(|v| format!("{v:.1}"))
        .unwrap_or_else(|| "—".into());

    let Some(ctx) = contexts.ctx_mut().ok() else {
        return;
    };

    egui::TopBottomPanel::top("overlay").show(ctx, |ui| {
        ui.horizontal(|ui| {
            ui.label(format!("FPS: {fps}"));
            ui.separator();
            if cursor.valid {
                ui.label(format!("tile: ({}, {})", cursor.x, cursor.y));
            } else {
                ui.label("tile: —");
            }
            if let Some(b) = bounds.as_deref() {
                ui.separator();
                ui.label(format!("map: {}x{}", b.width, b.height));
            }
        });
    });

    egui::SidePanel::left("info").show(ctx, |ui| {
        ui.heading(&world_model.world_name);
        ui.label(format!("theme: {}", world_model.theme_id));
        ui.label(format!("tile size: {}px", world_model.tile_size));
        ui.add_space(8.0);
        ui.label(format!("layers: {}", world_model.layers.len()));
        for (i, l) in world_model.layers.iter().enumerate() {
            ui.label(format!(
                "{}: {} {}{}",
                i,
                l.name,
                if l.visible { "[vis]" } else { "[hid]" },
                if l.id == world_model.active_layer { " *" } else { "" },
            ));
        }
        ui.add_space(12.0);
        ui.label("[B] brush  [E] erase  [L-drag] paint");
        ui.label("[wheel] zoom  [mid/right-drag] pan");

        ui.add_space(12.0);
        if ui.button("Save .gemap").clicked() {
            let target = path
                .0
                .clone()
                .unwrap_or_else(|| PathBuf::from("glyphweave_save.gemap"));
            match save_world(&world_model.0, &target) {
                Ok(()) => println!("[glyphweave] saved {}", target.display()),
                Err(e) => eprintln!("[glyphweave] save failed: {e}"),
            }
        }
    });
}
