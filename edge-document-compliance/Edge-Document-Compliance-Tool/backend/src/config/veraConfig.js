/**
 * Vera Configuration
 * Centralized configuration for Vera AI subsystem
 */

// Debug mode PINs (can be overridden via environment variables)
export const VERA_DEBUG_PIN = process.env.VERA_DEBUG_PIN || '0331';
export const VERA_DEBUG_EXIT_PIN = process.env.VERA_DEBUG_EXIT_PIN || '0000';

