#!/usr/bin/env python3
"""
Muaina Report PDF Generator
Uses ReportLab to generate professional medical report PDFs
"""

import sys
import json
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# Colors
PRIMARY_COLOR = colors.HexColor('#5b0202')
SUCCESS_COLOR = colors.HexColor('#166534')
WARNING_COLOR = colors.HexColor('#92400e')
DANGER_COLOR = colors.HexColor('#991b1b')
INFO_COLOR = colors.HexColor('#1e40af')
NEUTRAL_COLOR = colors.HexColor('#374151')
LIGHT_BG = colors.HexColor('#f9fafb')


def create_styles():
    """Create custom paragraph styles"""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name='Logo',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=PRIMARY_COLOR,
        spaceAfter=6,
    ))

    styles.add(ParagraphStyle(
        name='Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=NEUTRAL_COLOR,
        spaceAfter=12,
    ))

    styles.add(ParagraphStyle(
        name='SectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=PRIMARY_COLOR,
        spaceBefore=16,
        spaceAfter=8,
        borderPadding=4,
    ))

    styles.add(ParagraphStyle(
        name='SubSectionTitle',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=NEUTRAL_COLOR,
        spaceBefore=12,
        spaceAfter=6,
    ))

    styles.add(ParagraphStyle(
        name='CustomBodyText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=NEUTRAL_COLOR,
        spaceAfter=6,
        leading=14,
    ))

    styles.add(ParagraphStyle(
        name='ListItem',
        parent=styles['Normal'],
        fontSize=10,
        textColor=NEUTRAL_COLOR,
        leftIndent=20,
        spaceAfter=4,
    ))

    styles.add(ParagraphStyle(
        name='SuccessText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=SUCCESS_COLOR,
        leftIndent=20,
        spaceAfter=4,
    ))

    styles.add(ParagraphStyle(
        name='DangerText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DANGER_COLOR,
        leftIndent=20,
        spaceAfter=4,
    ))

    styles.add(ParagraphStyle(
        name='WarningText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=WARNING_COLOR,
        leftIndent=20,
        spaceAfter=4,
    ))

    styles.add(ParagraphStyle(
        name='InfoText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=INFO_COLOR,
        leftIndent=20,
        spaceAfter=4,
    ))

    styles.add(ParagraphStyle(
        name='Disclaimer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=WARNING_COLOR,
        spaceAfter=6,
        leading=12,
    ))

    styles.add(ParagraphStyle(
        name='Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=NEUTRAL_COLOR,
        alignment=TA_CENTER,
    ))

    return styles


def get_classification_color(classification):
    """Get color based on classification"""
    if classification == 'normal':
        return SUCCESS_COLOR
    elif classification == 'abnormal':
        return WARNING_COLOR
    elif classification == 'critical':
        return DANGER_COLOR
    return NEUTRAL_COLOR


def generate_pdf(data):
    """Generate PDF from report data"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )

    styles = create_styles()
    story = []

    # ===== PAGE 1: Report Information & Analysis =====

    # Header
    story.append(Paragraph("MUAINA", styles['Logo']))
    story.append(Paragraph("AI-Powered Pathology Report Analysis", styles['Subtitle']))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY_COLOR))
    story.append(Spacer(1, 12))

    # Report Information Section
    story.append(Paragraph("Report Information", styles['SectionTitle']))

    info_data = [
        ["Report ID:", data.get('id', 'N/A')[:8] + "..."],
        ["File Name:", data.get('fileName', 'Unknown')],
        ["Uploaded:", data.get('uploadedAt', 'N/A')],
        ["Organization:", data.get('organizationName', 'Unknown')],
        ["Classification:", data.get('classification', 'pending').upper()],
        ["Review Status:", data.get('reviewStatus', 'pending')],
    ]

    info_table = Table(info_data, colWidths=[120, 350])
    classification_color = get_classification_color(data.get('classification', ''))
    info_table.setStyle(TableStyle([
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONT', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), NEUTRAL_COLOR),
        ('TEXTCOLOR', (1, 0), (1, -1), NEUTRAL_COLOR),
        ('TEXTCOLOR', (1, 4), (1, 4), classification_color),  # Classification color
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 16))

    # AI Analysis Summary
    story.append(Paragraph("AI Analysis Summary", styles['SectionTitle']))
    story.append(Paragraph(data.get('summary', 'No summary available'), styles['CustomBodyText']))
    story.append(Spacer(1, 8))
    story.append(Paragraph(data.get('details', 'No details available'), styles['CustomBodyText']))
    story.append(Spacer(1, 16))

    # Key Findings
    findings = data.get('findings', [])
    if findings:
        story.append(Paragraph("Key Findings", styles['SectionTitle']))
        for finding in findings:
            severity = finding.get('severity', 'info').upper()
            category = finding.get('category', '')
            description = finding.get('description', '')

            severity_color = NEUTRAL_COLOR
            if severity == 'CRITICAL':
                severity_color = DANGER_COLOR
            elif severity == 'WARNING':
                severity_color = WARNING_COLOR

            story.append(Paragraph(
                f"<b>[{severity}]</b> {category}",
                ParagraphStyle('FindingTitle', parent=styles['CustomBodyText'], textColor=severity_color)
            ))
            story.append(Paragraph(description, styles['ListItem']))
        story.append(Spacer(1, 16))

    # Disclaimer
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "<b>DISCLAIMER:</b> This AI-generated analysis is for informational purposes only and should not "
        "replace professional medical advice. Always consult with qualified healthcare providers "
        "for diagnosis and treatment decisions.",
        styles['Disclaimer']
    ))

    # ===== PAGE 2: Muaina Interpretation (if present) =====
    interpretation = data.get('muainaInterpretation')
    if interpretation:
        story.append(PageBreak())

        # Header
        story.append(Paragraph("MUAINA", styles['Logo']))
        story.append(Paragraph("Patient-Friendly Interpretation", styles['SectionTitle']))
        story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY_COLOR))
        story.append(Spacer(1, 12))

        # Medical Condition
        condition = interpretation.get('medicalCondition', {})
        if condition:
            story.append(Paragraph("Medical Condition", styles['SubSectionTitle']))
            story.append(Paragraph(
                f"<b>{condition.get('name', 'Unknown')}</b>",
                ParagraphStyle('ConditionName', parent=styles['CustomBodyText'], textColor=DANGER_COLOR, fontSize=12)
            ))
            story.append(Paragraph(condition.get('description', ''), styles['CustomBodyText']))
            severity = condition.get('severity', 'moderate').upper()
            icd = condition.get('icdCode', '')
            meta_text = f"Severity: {severity}"
            if icd:
                meta_text += f" | ICD Code: {icd}"
            story.append(Paragraph(meta_text, styles['ListItem']))
            story.append(Spacer(1, 12))

        # Summary
        story.append(Paragraph("What This Means", styles['SubSectionTitle']))
        story.append(Paragraph(interpretation.get('summary', ''), styles['CustomBodyText']))
        story.append(Spacer(1, 12))

        # Precautions
        precautions = interpretation.get('precautions', [])
        if precautions:
            story.append(Paragraph("Important Precautions", styles['SubSectionTitle']))
            for item in precautions:
                story.append(Paragraph(f"⚠ {item}", styles['WarningText']))
            story.append(Spacer(1, 12))

        # Diet
        diet = interpretation.get('diet', [])
        if diet:
            story.append(Paragraph("Diet Recommendations", styles['SubSectionTitle']))
            for item in diet:
                story.append(Paragraph(f"• {item}", styles['InfoText']))
            story.append(Spacer(1, 12))

        # Consultation
        consultation = interpretation.get('consultation', {})
        if consultation:
            story.append(Paragraph("Consultation Information", styles['SubSectionTitle']))
            story.append(Paragraph(
                f"<b>Follow-up:</b> {consultation.get('followUpTiming', 'N/A')}",
                styles['CustomBodyText']
            ))
            story.append(Paragraph(
                f"<b>How to Book:</b> {consultation.get('bookingInfo', 'N/A')}",
                styles['CustomBodyText']
            ))
            urgency = consultation.get('urgency', 'routine').upper()
            urgency_color = DANGER_COLOR if urgency == 'URGENT' else (WARNING_COLOR if urgency == 'SOON' else INFO_COLOR)
            story.append(Paragraph(
                f"<b>Priority:</b> {urgency}",
                ParagraphStyle('Urgency', parent=styles['CustomBodyText'], textColor=urgency_color)
            ))
            story.append(Spacer(1, 12))

        # Do's and Don'ts side by side
        dos = interpretation.get('dos', [])
        donts = interpretation.get('donts', [])
        if dos or donts:
            story.append(Paragraph("Do's and Don'ts", styles['SubSectionTitle']))

            if dos:
                story.append(Paragraph("<b>Things to Do:</b>", styles['CustomBodyText']))
                for item in dos:
                    story.append(Paragraph(f"✓ {item}", styles['SuccessText']))

            if donts:
                story.append(Paragraph("<b>Things to Avoid:</b>", styles['CustomBodyText']))
                for item in donts:
                    story.append(Paragraph(f"✗ {item}", styles['DangerText']))
            story.append(Spacer(1, 12))

        # Lifestyle Changes
        lifestyle = interpretation.get('lifestyleChanges', [])
        if lifestyle:
            story.append(Paragraph("Lifestyle Changes", styles['SubSectionTitle']))
            for item in lifestyle:
                story.append(Paragraph(f"• {item}", styles['ListItem']))
            story.append(Spacer(1, 12))

        # Disclaimer
        story.append(Spacer(1, 20))
        story.append(Paragraph(
            "This interpretation is designed to help you understand your results in simple terms. "
            "It is NOT a substitute for professional medical advice. Please discuss these findings "
            "with your healthcare provider.",
            styles['Disclaimer']
        ))

        # ===== PAGE 3: Suggested Doctors =====
        doctors = interpretation.get('suggestedDoctors', [])
        doctor_recs = interpretation.get('doctorRecommendations', [])

        if doctors or doctor_recs:
            story.append(PageBreak())

            # Header
            story.append(Paragraph("MUAINA", styles['Logo']))
            story.append(Paragraph("Recommended Healthcare Providers", styles['SectionTitle']))
            story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY_COLOR))
            story.append(Spacer(1, 12))

            if doctors:
                story.append(Paragraph("Suggested Doctors", styles['SubSectionTitle']))
                for doctor in doctors:
                    story.append(Paragraph(
                        f"<b>{doctor.get('name', 'N/A')}</b>",
                        ParagraphStyle('DocName', parent=styles['CustomBodyText'], textColor=SUCCESS_COLOR, fontSize=11)
                    ))
                    story.append(Paragraph(
                        f"{doctor.get('specialty', '')} - {doctor.get('qualification', '')}",
                        styles['CustomBodyText']
                    ))
                    story.append(Paragraph(f"Location: {doctor.get('location', 'N/A')}", styles['ListItem']))
                    story.append(Paragraph(f"Availability: {doctor.get('availability', 'N/A')}", styles['ListItem']))
                    story.append(Paragraph(f"Contact: {doctor.get('contact', 'N/A')}", styles['ListItem']))
                    if doctor.get('consultationFee'):
                        story.append(Paragraph(f"Fee: {doctor.get('consultationFee')}", styles['ListItem']))
                    story.append(Spacer(1, 10))

            if doctor_recs:
                story.append(Paragraph("Specialist Consultations Recommended", styles['SubSectionTitle']))
                for rec in doctor_recs:
                    urgency = rec.get('urgency', 'routine').upper()
                    story.append(Paragraph(
                        f"<b>{rec.get('specialty', 'N/A')}</b> ({urgency})",
                        styles['CustomBodyText']
                    ))
                    story.append(Paragraph(rec.get('reason', ''), styles['ListItem']))
                    story.append(Spacer(1, 6))

            # Disclaimer
            story.append(Spacer(1, 20))
            story.append(Paragraph(
                "The suggested doctors are recommendations based on your medical needs. "
                "Availability and fees may vary. Please contact the healthcare provider directly "
                "to confirm appointment details.",
                styles['Disclaimer']
            ))

    # Build PDF
    doc.build(story)
    return buffer.getvalue()


def main():
    """Main entry point - reads JSON from stdin, writes PDF to stdout"""
    try:
        # Read JSON from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)

        # Generate PDF
        pdf_bytes = generate_pdf(data)

        # Write PDF to stdout (binary)
        sys.stdout.buffer.write(pdf_bytes)
        sys.exit(0)

    except Exception as e:
        # Write error to stderr
        sys.stderr.write(f"Error generating PDF: {str(e)}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
