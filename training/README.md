# Optional training workspace

Training never starts automatically. Use consented, licensed JSONL chat data only. Run `validate.py` before splitting. Pin and verify compatible Transformers, PEFT, TRL, Accelerate, Datasets and bitsandbytes versions in an isolated environment. The repository intentionally does not fabricate a training API or download private data. Adapter merge, llama.cpp GGUF conversion and Q4_K_M quantization are separate reviewed human steps.
