# Legacy core source

The five function modules group reviewed global functions by responsibility.
bootstrap.js preserves constants, initialization and exact function slots.
No source module executes separately in the browser: one assembled classic
script preserves original hoisting, lexical bindings and side-effect order.

Check: node tools/build_core_runtime.cjs
After an intentional source edit: node tools/build_core_runtime.cjs --write
Then run regression tests. Never edit core_runtime_v1.js directly.
Slot markers must remain unique; new functions need a matching bootstrap slot.
Numerical changes require the separate approved model protocol.
