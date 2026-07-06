//! egui editor UI: top overlay (FPS/tile/mapsize), left palette + theme + save,
//! right layers panel (active/visible/locked). P2.
use crate::render::MapBounds;
use crate::resource::{ActiveTheme, CursorTile, WorldModel};
use crate::ActiveBrush;
use bevy::diagnostic::DiagnosticsStore;
use bevy::prelude::*;
use bevy_egui::{egui, EguiContexts};
use glyphweave_core::gemap::save_world;
use glyphweave_core::tile::TileKind;
use std::path::PathBuf;

/// Where the most recent load came from / where Save writes.
#[derive(Resource, Debug, Clone, Default)]
pub struct CurrentMapPath(pub Option<PathBuf>);

#[allow(clippy::too_many_arguments)]
pub fn ui_overlay(
    mut contexts: EguiContexts,
    diagnostics: Res<DiagnosticsStore>,
    cursor: Res<CursorTile>,
    mut world_model: ResMut<WorldModel>,
    bounds: Option<Res<MapBounds>>,
    path: Res<CurrentMapPath>,
    mut active_brush: ResMut<ActiveBrush>,
    mut active_theme: ResMut<ActiveTheme>,
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
            ui.separator();
            ui.label(format!("brush: {}", active_brush.0.id()));
        });
    });

    // Left: palette + theme + info + save.
    egui::SidePanel::left("palette").show(ctx, |ui| {
        ui.heading(&world_model.world_name);
        ui.label(format!("theme: {}", world_model.theme_id));
        ui.add_space(8.0);

        ui.label("Tiles (click to pick brush):");
        egui::ScrollArea::vertical().max_height(260.0).show(ui, |ui| {
            ui.horizontal_wrapped(|ui| {
                for kind in TileKind::ALL {
                    let selected = active_brush.0 == kind;
                    let label = format!("{} {}", kind.glyph(), kind.id());
                    if ui.selectable_label(selected, label).clicked() {
                        active_brush.0 = kind;
                    }
                }
            });
        });

        ui.add_space(8.0);
        ui.label("Theme:");
        ui.horizontal(|ui| {
            if ui.selectable_label(active_theme.0 == "ansi-16", "ANSI-16").clicked() {
                active_theme.0 = "ansi-16".into();
            }
            if ui.selectable_label(active_theme.0 == "cogmind", "Cogmind").clicked() {
                active_theme.0 = "cogmind".into();
            }
        });

        ui.add_space(12.0);
        ui.label("[L-drag] paint  [wheel] zoom");
        ui.label("[mid/right-drag] pan");
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

    // Right: layers. Snapshot to avoid holding a borrow across egui closures,
    // then write back.
    egui::SidePanel::right("layers").show(ctx, |ui| {
        ui.heading("Layers");
        let active = world_model.active_layer.clone();
        let mut rows: Vec<(usize, String, String, bool, bool)> = world_model
            .layers
            .iter()
            .enumerate()
            .map(|(i, l)| (i, l.id.clone(), l.name.clone(), l.visible, l.locked))
            .collect();
        let mut new_active: Option<String> = None;
        for (i, id, name, vis, lock) in &mut rows {
            let is_active = id.as_str() == active;
            ui.horizontal(|ui| {
                if ui
                    .selectable_label(is_active, format!("{}: {}", i, name))
                    .clicked()
                {
                    new_active = Some(id.clone());
                }
                ui.checkbox(vis, "vis");
                ui.checkbox(lock, "lock");
            });
        }
        for (i, _, _, vis, lock) in rows {
            if let Some(l) = world_model.layers.get_mut(i) {
                l.visible = vis;
                l.locked = lock;
            }
        }
        if let Some(a) = new_active {
            world_model.active_layer = a;
        }
    });
}
