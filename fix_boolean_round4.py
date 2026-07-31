import re

with open('src/components/leads/LeadDetail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix conditionals that return `unknown` causing TS2322 ReactNode errors
content = content.replace('{(isPlanesproLead || journey) && (', '{!!(isPlanesproLead || journey) && (')
content = content.replace('{journey && (', '{!!journey && (')
content = content.replace('{journey.resumen && (', '{!!journey.resumen && (')
content = content.replace('{journey.motivo && (', '{!!journey.motivo && (')
content = content.replace('{journey.necesidad && (', '{!!journey.necesidad && (')
content = content.replace('{journey.objetivo && (', '{!!journey.objetivo && (')
content = content.replace('{planesproDetails.rangoEdad && (', '{!!planesproDetails.rangoEdad && (')
content = content.replace('{(planesproDetails.rangoRenta || rawPayload.renta || rawPayload.renta_liquida) && (', '{!!(planesproDetails.rangoRenta || rawPayload.renta || rawPayload.renta_liquida) && (')
content = content.replace('{planesproDetails.sistema && planesproDetails.sistema.toLowerCase() === \'fonasa\' && (', '{!!(planesproDetails.sistema && String(planesproDetails.sistema).toLowerCase() === \'fonasa\') && (')
content = content.replace('{planesproDetails.isapre && (', '{!!planesproDetails.isapre && (')
content = content.replace('{planesproDetails.comuna && (', '{!!planesproDetails.comuna && (')
content = content.replace('{planesproDetails.region && (', '{!!planesproDetails.region && (')
content = content.replace('{planesproDetails.comentario && (', '{!!planesproDetails.comentario && (')
content = content.replace('{(planesproDetails.numeroCargas && planesproDetails.numeroCargas !== \'0\') && (', '{!!(planesproDetails.numeroCargas && planesproDetails.numeroCargas !== \'0\') && (')

with open('src/components/leads/LeadDetail.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed boolean coercions")
