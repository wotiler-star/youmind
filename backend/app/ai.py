"""AI 对话服务。

- 配置了 OPENROUTER_API_KEY 时，走 OpenRouter 流式接口（默认 Gemini 等模型）。
- 未配置 key 时回退为「回显 + 提示」，保证本地/演示环境无需密钥也能跑通流式链路。
"""
import os
import json
import asyncio

import httpx

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "openrouter/google/gemini-3-pro-preview")


async def stream_chat(message: str, history=None):
    """异步生成器，逐块产出文本片段。"""
    if not OPENROUTER_API_KEY:
        echo = (
            "（当前未配置 OPENROUTER_API_KEY，以下为回显模式）\n\n"
            "你刚才说：\n"
        )
        for chunk in [echo, message]:
            for i in range(0, len(chunk), 8):
                yield chunk[i : i + 8]
                await asyncio.sleep(0.015)
        return

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    messages = [{"role": "user", "content": message}]
    if history:
        messages = history + messages
    payload = {"model": DEFAULT_MODEL, "messages": messages, "stream": True}

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        ) as resp:
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    obj = json.loads(data)
                    delta = obj["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
                except Exception:
                    continue
