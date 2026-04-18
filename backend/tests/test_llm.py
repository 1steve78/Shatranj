# T11: Schema validation of Skill Gap object
# T12: Positional drift sliced context validation

import pytest
import json
from app.services.ai_service import explain_move

def test_t11_schema_validation():
    # If the user has a valid NVIDIA API Key in .env, this will execute an actual request.
    # Otherwise, our error fallback still returns the valid schema, just with "Error" data.
    response = explain_move(
        move="Qh5",
        move_type="blunder",
        score=-5.00,
        best_move="Nf3"
    )
    
    # Assert JSON structured Object is returned directly from ai_service.py (we returned a dict)
    assert isinstance(response, dict)
    
    # Strictly validate schema keys
    assert "tactical_explanation" in response
    assert "skill_gap_simulation" in response
    assert "psychological_flaw" in response
    assert "internal_classification" in response

def test_t12_positional_drift_context():
    # Similar to above, checks the response when previous_moves_context is provided
    ctx = "Previous logic leading here: e4 (good), e5 (blunder), Nf3 (inaccuracy)."
    response = explain_move(
        move="Bc4",
        move_type="inaccuracy",
        score=0.5,
        best_move="d4",
        game_phase="Opening",
        previous_moves_context=ctx
    )
    
    assert isinstance(response, dict)
    assert "tactical_explanation" in response
