"""启动脚本"""

import uvicorn
from app.config import get_settings  # type: ignore[reportMissingImports]  # FastAPI 项目，运行时以 backend/ 为工作目录

if __name__ == "__main__":
    settings = get_settings()
    
    uvicorn.run(
        "app.api.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower()
    )

