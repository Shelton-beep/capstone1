# Data Dictionary

## Overview
This document describes the data structure and fields used in the Legal Outcome Prediction System.

## Data Sources

### 1. CourtListener Dockets (`courtlistener_dockets_partial.csv`)
Contains metadata about legal cases from CourtListener.

**Key Fields:**
- `id`: Unique docket identifier
- `docket_id`: Docket ID (string format)
- `case_name`: Name of the case
- `court`: Court identifier (e.g., "scotus", "ca9", etc.)
- `date_filed`: Date the case was filed
- `date_terminated`: Date the case was terminated
- `docket_number`: Official docket number
- `nature_of_suit`: Type of legal matter (e.g., "civil rights", "contract", "tort")
- `jurisdiction_type`: Type of jurisdiction (e.g., "federal", "state")

### 2. Opinions (`opinions_checkpoint.csv`)
Contains legal opinion text and outcomes.

**Key Fields:**
- `docket_id`: Links to docket data
- `opinion_id`: Unique opinion identifier
- `opinion_type`: Type of opinion (e.g., "010combined")
- `opinion_text`: Full text of the legal opinion
- `outcome`: Case outcome (e.g., "AFFIRMED", "REVERSED", "VACATED", "REMANDED", "GRANTED", "DISMISSED", "DENIED")
- `date_filed`: Date opinion was filed

## Merged Dataset

After merging dockets and opinions on `docket_id`, the final dataset contains:

- `case_name`: Case name
- `court`: Court identifier
- `opinion_text`: Original opinion text
- `clean_text`: Cleaned opinion text (outcome-revealing words removed)
- `outcome`: Original outcome label
- `winlose`: Binary label (win/lose)

## Data Cleaning

### Text Cleaning Process
1. **Outcome Word Removal**: Removes words like AFFIRMED, REVERSED, VACATED, REMANDED, GRANTED, DISMISSED, DENIED
2. **Tail-Scrubbing**: Cleans last 2000 characters to remove procedural boilerplate
3. **Pattern Removal**: Removes patterns like:
   - "Judgment vacated, and remanded..."
   - "Certiorari granted..."
   - "The petition for rehearing is denied..."

### Label Mapping

**Win Cases:**
- reversed
- granted

**Lose Cases:**
- affirmed
- denied
- dismissed
- remanded

**Unknown:**
- Cases that don't match above patterns are dropped

## Data Statistics

- Total cases after merging: Variable (depends on CSV files)
- Training/Test split: 80/20
- Embedding dimension: 768 (LegalBERT base)

