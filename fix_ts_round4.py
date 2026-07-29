import re

with open('src/components/leads/LeadDetail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix string coercion issues that cause TS error TS2322 (unknown not assignable to ReactNode)
# We replace String(...) with `${...}` in JSX interpolations.

# journey.resumen
content = content.replace('{String(journey.resumen)}', '{`${journey.resumen || \'\'}`}')

# journey.motivo
content = content.replace('String(journey.motivo)', '`${journey.motivo || \'\'}`')

# journey.necesidad
content = content.replace('String(journey.necesidad)', '`${journey.necesidad || \'\'}`')

# journey.objetivo
content = content.replace('String(journey.objetivo)', '`${journey.objetivo || \'\'}`')

# rangoRenta and others
content = content.replace('{String(planesproDetails.rangoRenta || toReadableValue(rawPayload.renta) || toReadableValue(rawPayload.renta_liquida))}', '{`${planesproDetails.rangoRenta || toReadableValue(rawPayload.renta) || toReadableValue(rawPayload.renta_liquida) || \'\'}`}')

# visibleAppointmentStatus
content = content.replace('{String(visibleAppointmentStatus)}', '{`${visibleAppointmentStatus || \'\'}`}')

# formatAppointmentDate
content = content.replace('formatAppointmentDate(String(visibleAppointmentAt))', 'formatAppointmentDate(`${visibleAppointmentAt || \'\'}`)')

with open('src/components/leads/LeadDetail.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed TS errors")
