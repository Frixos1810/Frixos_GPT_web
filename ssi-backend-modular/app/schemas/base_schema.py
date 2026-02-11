# app/schemas/base_schema.py
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr

# Put any shared base mixins or helpers here later.
# For now we just centralize the common imports so other schema modules
# can import from here if you like.
