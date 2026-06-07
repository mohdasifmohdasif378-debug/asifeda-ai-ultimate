from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_user
from app.models import User
from app.schemas import ChatRequest, ChatResponse, ErrorResponse
from app.config import settings
import anthropic

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post(
    "",
    response_model=ChatResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a message to the AsifEdA AI and receive a response."""
    if not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty",
        )

    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service is not configured. Set ANTHROPIC_API_KEY.",
        )

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            system=(
                "You are AsifEdA, a helpful AI assistant for competitive exam preparation. "
                "You specialize in UPSC, SSC, NDA, NEET, JEE, and JKSSB exams. "
                "Provide clear, accurate, and educational responses."
            ),
            messages=[{"role": "user", "content": request.message}],
        )
        reply = response.content[0].text
    except anthropic.APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI API error: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )

    return ChatResponse(reply=reply)
