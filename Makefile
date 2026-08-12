# ============================================================================
#  zfbauto — ZeaZ Platform App
# ============================================================================

APP_NAME := zfbauto
STACK    := node
PORT     ?= 3130

PLATFORM_ROOT := $(shell git rev-parse --show-toplevel 2>/dev/null || echo ../..)

include $(PLATFORM_ROOT)/make/common.mk

# ── App-specific targets (add below) ─────────────────────────────────────
