from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, get_current_user
from app.core.config import settings
from app.core.logging_config import logger
from app.core.security import create_access_token
from app.database.models import User

class GoogleLoginRequest(BaseModel):
    credential: str

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/google")
def google_login(
    payload: GoogleLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Verify a Google Sign-In ID token and create/find the local user.
    Issues a local application JWT session token.
    """
    # 0. Validate credential input
    if not payload.credential or not payload.credential.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google authentication credential is required.",
        )

    if not settings.GOOGLE_CLIENT_ID:
        logger.error("GOOGLE_CLIENT_ID is not configured on the backend.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google authentication service is misconfigured.",
        )

    # 1. Verify the token with Google
    try:
        google_user = id_token.verify_oauth2_token(
            payload.credential,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as e:
        logger.warning(f"Google token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google authentication token.",
        )
    except Exception as e:
        logger.error(f"Unexpected error verifying Google token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to verify Google authentication token.",
        )

    # 2. Validate token audience against configured Google Client ID
    if google_user.get("aud") != settings.GOOGLE_CLIENT_ID:
        logger.warning("Google token audience mismatch.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token audience does not match configured Google Client ID.",
        )

    # 3. Make sure the Google account has a verified email
    email_verified = google_user.get("email_verified")
    if email_verified is not True and str(email_verified).lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google email address is not verified.",
        )

    google_sub = google_user.get("sub")
    email = google_user.get("email")

    if not google_sub or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account information is incomplete.",
        )

    now = datetime.now(timezone.utc)

    # 4. Find existing user using Google's stable ID and create/update
    try:
        user = (
            db.query(User)
            .filter(User.google_sub == google_sub)
            .first()
        )

        if user is None:
            user = User(
                google_sub=google_sub,
                email=email,
                name=google_user.get("name"),
                picture=google_user.get("picture"),
                created_at=now,
                last_login=now,
            )
            db.add(user)
        else:
            user.email = email
            user.name = google_user.get("name")
            user.picture = google_user.get("picture")
            user.last_login = now

        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        logger.error(f"Database error while saving user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist user profile.",
        )

    # 5. Issue local application JWT session token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email}
    )

    # 6. Return safe user information and token (google_sub is kept internal)
    return {
        "message": "Google login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
        },
    }


@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """
    Validate the caller's JWT session and return current user profile.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture,
    }


@router.post("/logout")
def logout():
    """Client-side session invalidation acknowledgment."""
    return {"message": "Logged out successfully"}


@router.post("/dev-login")
def dev_login(db: Session = Depends(get_db)):
    """
    Local development and testing login endpoint.
    Issues a valid JWT session for testing without requiring interactive Google Sign-In.
    """
    if not settings.DEBUG and settings.APP_ENV != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login is only permitted in development mode.",
        )

    now = datetime.now(timezone.utc)
    dev_sub = "dev-operator-sub-0001"
    user = db.query(User).filter(User.google_sub == dev_sub).first()
    if not user:
        user = User(
            google_sub=dev_sub,
            email="analyst@sovereignblackice.internal",
            name="Compliance Analyst",
            picture="https://api.dicebear.com/7.x/identicon/svg?seed=SBI",
            created_at=now,
            last_login=now,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.last_login = now
        db.commit()

    access_token = create_access_token(
        data={"sub": user.id, "email": user.email}
    )

    return {
        "message": "Dev login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
        },
    }
