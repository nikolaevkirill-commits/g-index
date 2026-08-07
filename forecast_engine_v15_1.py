"""Canonical v15.1 entry point with post-freeze correctness patches.

The unchanged historical implementation is preserved in
``forecast_engine_v15_1_frozen.py``.  Importing this module activates only the
canonical tag-alias parser and the fixed aggregate bolt rescue policy.
"""

from forecast_engine_v15_1_correctness import *  # noqa: F401,F403
from forecast_engine_v15_1_correctness import __all__
