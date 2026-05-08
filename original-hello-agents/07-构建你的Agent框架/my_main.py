"""
第七章 构建你的Agent框架 - 主程序入口
演示使用自定义的 MyLLM 调用 ModelScope provider。
"""
from dotenv import load_dotenv
from my_llm import MyLLM

# 加载环境变量
load_dotenv("/home/Creeken/Paper/harness/.env")

# 实例化我们重写的客户端，并指定provider
llm = MyLLM(provider="modelscope")

# 准备消息
messages = [{"role": "user", "content": "你好，请介绍一下你自己。"}]

# 发起调用，think等方法都已从父类继承，无需重写
response_stream = llm.think(messages)

# 打印响应
print("ModelScope Response:")
for chunk in response_stream:
    # chunk在my_llm库中已经打印过一遍，这里只需要pass即可
    # print(chunk, end="", flush=True)
    pass
