//! 2D camera with wheel zoom-to-cursor and middle/right-drag pan.
//! Pan/zoom are suppressed while egui wants pointer input.
use bevy::input::mouse::AccumulatedMouseScroll;
use bevy::prelude::*;

/// Spawn a Camera2d with an explicit OrthographicProjection we can mutate.
pub fn spawn_camera(mut commands: Commands) {
    commands.spawn((
        Camera2d,
        Projection::from(OrthographicProjection {
            scale: 1.0,
            ..OrthographicProjection::default_2d()
        }),
    ));
}

#[derive(Default, Debug, Clone, Copy)]
pub struct PanState {
    pub last_cursor: Option<Vec2>,
}

pub fn zoom_to_cursor(
    cam: Single<(&Camera, &GlobalTransform, &mut Transform, &mut Projection)>,
    window: Single<&Window>,
    scroll: Res<AccumulatedMouseScroll>,
) {
    let (camera, cam_gtf, mut cam_tf, mut projection) = cam.into_inner();
    let Projection::Orthographic(ref mut ortho) = *projection else {
        return;
    };

    // bevy 0.18: AccumulatedMouseScroll { unit, delta }. delta.y: scroll up > 0.
    let dy = scroll.delta.y;
    if dy.abs() < 1e-3 {
        return;
    }

    let Some(cursor) = window.cursor_position() else {
        return;
    };
    let Ok(world_before) = camera.viewport_to_world_2d(cam_gtf, cursor) else {
        return;
    };

    // Scroll up (dy>0) -> zoom in (smaller scale).
    let factor = 1.0 - dy.signum() * 0.1;
    ortho.scale = (ortho.scale * factor).clamp(0.05, 50.0);

    if let Ok(world_after) = camera.viewport_to_world_2d(cam_gtf, cursor) {
        cam_tf.translation.x += world_before.x - world_after.x;
        cam_tf.translation.y += world_before.y - world_after.y;
    }
}

pub fn pan_camera(
    mut cam_tf: Single<&mut Transform, With<Camera2d>>,
    buttons: Res<ButtonInput<MouseButton>>,
    window: Single<&Window>,
    camera: Single<(&Camera, &GlobalTransform)>,
    mut state: Local<PanState>,
) {
    let dragging = buttons.pressed(MouseButton::Middle) || buttons.pressed(MouseButton::Right);
    let (cam, gtf) = *camera;
    let Some(p) = window.cursor_position() else {
        state.last_cursor = None;
        return;
    };

    if !dragging {
        state.last_cursor = Some(p);
        return;
    }

    let Some(prev) = state.last_cursor else {
        state.last_cursor = Some(p);
        return;
    };

    if let (Ok(w_prev), Ok(w_now)) = (
        cam.viewport_to_world_2d(gtf, prev),
        cam.viewport_to_world_2d(gtf, p),
    ) {
        let delta = w_prev - w_now;
        cam_tf.translation.x += delta.x;
        cam_tf.translation.y += delta.y;
    }
    state.last_cursor = Some(p);
}
