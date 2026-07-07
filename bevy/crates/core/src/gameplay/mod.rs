//! Core sandbox gameplay primitives.
//!
//! This module is deliberately UI-agnostic. Human mouse tools, typed command
//! boxes, future ASR, and future local LLM parsers should all produce the same
//! `GameCommand` values and let the dispatcher/simulation own validation.

pub mod command;
pub mod sim;
pub mod state;

pub use command::{
    BuildBlueprint, BuildKind, CommandDispatcher, CommandEnvelope, CommandError, CommandReceipt,
    CommandSource, CommandSourceKind, GameCommand, RuleBasedTextCommandSource,
};
pub use sim::{
    SimulationConfig, TickResult, build_cost, is_choppable, is_mineable, is_passable,
    resource_from_chop, resource_from_mine, tick_gameplay,
};
pub use state::{
    EntityId, FogMemory, GameEvent, GameState, GameTime, Inventory, ItemPile, Job, JobKind,
    JobStatus, Monster, ResourceKind, Stockpile, TileArea, TileCoord, Worker, WorkerStatus,
};
