import openpyxl, csv, re, io
from openpyxl.utils import column_index_from_string as ci
BASE="/Users/andrew/Dropbox/01_active/every*where/2026/"
wb=openpyxl.load_workbook(BASE+"program/ADW PROGRAM DETAILS -  Updated 14.09.xlsx",data_only=True)
ws=wb["PROGRAM"]; tk=wb["TICKET + IMAGE LINKS"]

def g(r,c):
    v=ws.cell(row=r,column=ci(c)).value
    return re.sub(r'\s+',' ',str(v)).strip() if v is not None else ""

# Category comes from the section blocks: column K labels a block, blank rows separate them.
SECTIONS=[(12,59,"EXH"),(61,64,"INST"),(66,72,"OPEN"),(74,74,"CONV"),(76,94,"CONV"),
          (96,100,"TOUR"),(102,105,"WORK")]
DAYS=[("Q","thu 8 oct"),("R","tue 13 oct"),("S","wed 14 oct"),("T","thu 15 oct"),
      ("U","fri 16 oct"),("V","sat 17 oct"),("W","sun 18 oct")]

# Ticket sheet rows, keyed by their own event name.
TICK={}
for r in range(3,tk.max_row+1):
    n=tk.cell(row=r,column=7).value
    if n: TICK[str(n).strip()]=(tk.cell(row=r,column=14).value, tk.cell(row=r,column=15).value)

# Hand-checked title map: PROGRAM event -> TICKET sheet event. Fuzzy matching produced
# wrong pairs (SLOT->soft, EST OPEN STUDIO->Mixed Goods), so every pair here is explicit.
MAP={
 "10 x 10":"10x10","A ROOM OF ONE'S OWN":"A Room of One’s Own",
 "ADW CLOSING PARTY x COMPANY WORKS":"ADW CLOSING PARTY x COMPANY WORKS",
 "AFTER HOURS":"After Hours","AFTERLIFE":"Afterlife","ANTHO":"ANTHO","AT THE TABLE":"At The Table",
 "BENCHED":"BENCHED","BLOOM":"BLOOM","CARDENING CLUB":"Cardening Club","DESIGN FOR CARE":"Design for Care",
 "GROUNDED":"Grounded","LIVING ON THE CEILING":"Living on the ceiling","MADE IN AUS":"MADE IN AUS",
 "MAKING SPACE":"making space","MOVEMENT ACROSS SCALES":"Movement Across Scales",
 "NEO TEEN TAKEOVER : LETS GOGH (13-17 years)":"Neo Teen Takeover: Let's Gogh",
 "NOW: NEW/OLD WORKS":"NOW: New/Old Works","OBJECT TO MATERIAL":"Object to Material",
 "PUBLIC NOTICE":"Public Notice","POWER SURGE: INTO THE GRID":"Power Surge: Into The Grid",
 "PROCESSED":"PROCESSED","SHOP GENERATOR":"SHOP GENERATOR","SKANGAROOVIA":"Skangaroovia","SOFT":"soft",
 "STARRY STARRY NIGHT":"Starry Starry Night","STEEL SKIN (performance)":"STEEL SKIN",
 "SUPER PARTY":"Super Party","TAC COLLECTION":"taC Collection","TO FEEL IN PLACE":"To Feel In Place",
 "TOKEN":"TOKEN","TOMORROW TALENT":"Tomorrow Talent","TORPOR DAY BED":"Torpor day bed",
 "TWO WAY":"Two-way","UNBUILT":"UNBUILT","UNDER A BRIDGE":"Under a Bridge",
 "WASTE RECONSIDERED":"WASTE RECONSIDERED","X KEULEMANS":"X Guy Keulemans",
 "YOKE, OBJECTS FOR HUMANS":"YOKE • objects for human","MIXED GOODS : OPEN STUDIO":"Mixed Goods Open Studio",
 "YADURA : OPEN HOUSE":"Yadura","FROM POLICY TO PLACE":"From Polict to Place",
 "BESPOKE INTENTION":"Bespoke Intention","COVERS AND PAGES":"Covers + Pages: A publishing design chat",
 "DESIGNING DEEPLY":"Designing Deeply – The paradox of universal design",
 "ÉMIGRÉ : SPEAKER SERIES":"Émigré: Speaker Series at Lynton Residence",
 "In Conversation: Insights, Process and Material Integrity in Lighting Design":
   "In Conversation: Insights, Process and Material Integrity in Lighting Design ",
 "JAM FACTORY x GUY KEULEMANS":"JamFactory Wednesday Talk: Guy Keulemans ",
 "JON GOULDER x AGSA":"Tuesday Talk - Jon Goulder in conversation with Rebecca Evans",
 "MADE HERE":"Made Here","METIS (Navigating Systems Change)":"METIS [ navigating systems change ]",
 "MONET TO MATISSE : ART TO EXHIBITION":"Art of Exhibition: Behind the scenes of Monet to Matisse",
 "THE FRINGE CONDITION : EXTREME DESIGN":"The Fringe Condition: Designing for Life at the Extremes",
 "YES YOU CAN DO A PHD":"Yep, you can do a PhD in design!","YOU'RE NOT FINISHED YET":"You're Not Finished Yet!",
 "EVERY*BIKE TOUR":"Every*bike Tour","LISTENING WITH ARCHITECTURE":"Listening with Architecture",
 "MODERNIST ADELAIDE WALKING TOUR":"Modernist Adelaide walking tour",
 "TORRENS RIVER CITY WALK":"Torrens River City walk","THE DIGITAL PAUSE - Collage Evening":"The Digital Pause",
 "THREADING STORIES":"Threading Stories","WAX CARVING : RING MAKING":"wax carving ring making class ",
 "INSIDE INNOVATION : INSIDE QANTAS TOUR":"Inside Innovation: A Walk Through Qantas’ New Product Innovation Centre",
}
TICKN={k.strip():v for k,v in TICK.items()}
FREE=re.compile(r'^(free|0|none|nil|\$?0(\.00)?)\b',re.I)

def ticket(title):
    name=MAP.get(title)
    if name is None: return "","",None
    price,link=TICK.get(name, TICKN.get(name.strip(),(None,None)))
    link=str(link).strip() if link else ""
    if not re.match(r'^(https?://|www\.)',link): link=""      # "TBC@TBC.com" etc. are not links
    priced = bool(price) and not FREE.match(str(price).strip())
    return ("yes" if (link or priced) else ""), link, price

rows=[]; notes=[]
for lo,hi,cat in SECTIONS:
    for r in range(lo,hi+1):
        title=g(r,'L')
        if not title: continue
        sessions=[(lab,g(r,col)) for col,lab in DAYS]
        tickd,link,price=ticket(title)
        contributors="; ".join(p.strip(" ,") for p in re.split(r',(?![^(]*\))', g(r,'AI')) if p.strip(" ,"))
        rows.append({"category":cat,"title":title,"ticketed":tickd,"venue":g(r,'M'),
                     "blurb":g(r,'AK'),"link":link,"contributors":contributors,"adw_presented":"",
                     **{lab:val for lab,val in sessions},"_row":r,"_price":price})

# SHOPFRONTS is entered twice (row 42 exhibition, row 63 installation) with the same
# all-day times; one row carries a Sunday tour. The site needs one row per title.
sf=[x for x in rows if x["title"]=="SHOPFRONTS"]
if len(sf)==2:
    keep,drop=sf[0],sf[1]
    for _,lab in DAYS:
        vals=[v for v in (keep[lab],drop[lab]) if v]
        # An all-day opening reads first, with the tour as the second session.
        vals.sort(key=lambda v: 0 if v.lower().startswith("(all day") else 1)
        keep[lab]="; ".join(dict.fromkeys(vals))
    rows.remove(drop)
    notes.append(f"SHOPFRONTS appeared twice (rows {keep['_row']} and {drop['_row']}); merged into one row, "
                 f"sun 18 oct = '{keep['sun 18 oct']}'.")

for x in rows:
    if not any(x[lab] for _,lab in DAYS):
        notes.append(f"row {x['_row']} '{x['title']}' has no times in any day column.")

# The ADW mark is site metadata the spreadsheet has no column for, so it is carried
# across by title rather than read from the sheet. SHOPFRONTS was "ADW X SHOPFRONT
# DESIGN CIRCUIT" when it was flagged.
ADW={"ADW OPENING PARTY x SHORT NOTICE","ADW CLOSING PARTY x COMPANY WORKS","SHOPFRONTS"}
for x in rows:
    if x["title"] in ADW: x["adw_presented"]="yes"

HDR=["category","title","ticketed","venue","blurb","link","contributors","adw_presented"]+[l for _,l in DAYS]
out=io.StringIO()
w=csv.DictWriter(out,fieldnames=HDR,extrasaction="ignore",lineterminator="\n")
w.writeheader()
for x in rows: w.writerow(x)
open(BASE+"adw-website/src/_data/program-2026.csv","w").write(out.getvalue())

print(f"{len(rows)} events written")
used={MAP[x['title']] for x in rows if x['title'] in MAP}
print("\nTicket rows not used:", *sorted(set(TICK)-used), sep="\n  ")
print("\nEvents with no ticket-sheet match:", *[x['title'] for x in rows if x['title'] not in MAP], sep="\n  ")
print("\nNotes:", *notes, sep="\n  ")
