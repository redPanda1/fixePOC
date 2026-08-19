from pathlib import Path

from strands import tool

DATA_DIR = Path(__file__).parent / "data"


@tool
def get_fixe_data() -> dict:
    """
    Retrieve reference information about FIXE, the company, for answering user questions.

    Use this whenever the user asks about FIXE: its products, services, pricing,
    integrations, or its CEO/co-founder Ryan Handel.

    Returns:
        A dictionary with FIXE's company dossier and CEO bio as text.
    """
    dossier = (DATA_DIR / "FIXE_Company_Dossier.md").read_text()
    ceo_bio = (DATA_DIR / "ryanData.txt").read_text()

    return {
        "status": "success",
        "content": [
            {"text": dossier},
            {"text": ceo_bio},
        ],
    }
