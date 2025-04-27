import os
import logging
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import Request, Depends, HTTPException
from sqlalchemy.orm import Session
from api.database.database import get_db
from api.models.models import UserDB

# Set up logging
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
try:
    firebase_creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not firebase_creds_path:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS must be set for Firebase Admin SDK")
        
    logger.info(f"Initializing Firebase with credentials from: {firebase_creds_path}")
    
    # Check if the file exists
    if not os.path.exists(firebase_creds_path):
        raise FileNotFoundError(f"Firebase credentials file not found: {firebase_creds_path}")
        
    # Initialize Firebase Admin SDK
    try:
        firebase_admin.initialize_app(credentials.Certificate(firebase_creds_path))
        logger.info("Firebase Admin SDK initialized successfully")
    except ValueError as e:
        logger.error(f"Firebase initialization error (credentials format): {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Firebase initialization error: {str(e)}")
        raise
        
except Exception as e:
    logger.critical(f"Failed to initialize Firebase: {str(e)}")
    # Still allow app to start, but auth will fail

# Dependency to get current user from Firebase token
def get_current_user(request: Request, db: Session = Depends(get_db)) -> str:
    auth_header = request.headers.get("Authorization")
    logger.debug(f"Authorization header: {auth_header[:10]}..." if auth_header else "None")
    
    if not auth_header:
        logger.warning("No Authorization header found")
        raise HTTPException(status_code=401, detail="No Authorization header")
        
    if not auth_header.startswith("Bearer "):
        logger.warning("Authorization header does not start with 'Bearer '")
        raise HTTPException(status_code=401, detail="Invalid Authorization format")
        
    id_token = auth_header.split(" ")[1]
    logger.debug(f"Token length: {len(id_token)}")
    
    try:
        # Verify the Firebase token
        logger.info("Verifying Firebase token")
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token.get("uid")
        logger.info(f"Successfully verified token for user: {uid}")
        
        # Ensure user exists in DB
        user = db.query(UserDB).filter(UserDB.uid == uid).first()
        if not user:
            logger.info(f"Creating new user record for: {uid}")
            user = UserDB(
                uid=uid,
                email=decoded_token.get("email", ""),
                displayName=decoded_token.get("name", "")
            )
            db.add(user)
            db.commit()
        return uid
    except ValueError as e:
        logger.error(f"ValueError during token verification: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid token format: {str(e)}")
    except firebase_admin.exceptions.FirebaseError as e:
        logger.error(f"Firebase error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Firebase authentication error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during authentication: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
