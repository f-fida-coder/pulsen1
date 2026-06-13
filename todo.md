# Solpulsen ROI Energy Dashboard – TODO

## Databas & Backend
- [x] Drizzle-schema: system_configs, price_history, savings_records, weather_history, reports
- [x] DB-migrering körd (pnpm drizzle-kit migrate)
- [x] tRPC-procedurer: configs CRUD, savings, reports
- [x] Vitest-tester för backend (7 tester passerar)

## Frontend – Hooks
- [x] useVielhandlareAPI – elpriser från Vielhandlare.se
- [x] useSpotPrices – fallback elprisetjustnu.se
- [x] useHistoricalPrices – historiska priser 7–90 dagar
- [x] useSMHIWeather – SMHI Open Data väder/vind
- [x] useZoneComparison – SE1–SE4 prisjämförelse

## Frontend – Komponenter
- [x] SpotPricePanel – realtidspriser + graf + optimala tider
- [x] PriceHistory – historisk prisanalys med Recharts
- [x] ZoneComparison – SE1–SE4 jämförelse
- [x] WindAnalysisPanel – SMHI vinddata + 5 svenska städer
- [x] WindSimulation – animerad vindturbin
- [x] WindRose – vindrosdiagram SVG
- [x] SystemConfig – konfigurationsformulär
- [x] ConfigurationManager – inbyggt i SystemConfig (demo-scenarion)
- [x] ROI-kalkyl (calculateROI) med tre demo-scenarion

## Demo-scenarion
- [x] Villa SE3 – 10 kWp sol, 10 kWh batteri, värmepump
- [x] BRF SE4 – 50 kWp sol, 30 kWh batteri
- [x] Industri SE2 – 200 kWp sol, 50 kW vind, 100 kWh batteri

## Design & Layout
- [x] Nordisk design: muted blue-grey, Inter-font
- [x] Header + KPI-strip + tab-layout
- [x] KPI-kort (sol, batteri, besparing, payback)
- [x] Flikar: Elpriser | Vindanalys | Konfiguration | ROI

## Övrigt
- [x] Checkpoint och publicering

## Bugfix
- [x] CORS-fel: SMHI och Vielhandlare API blockeras i webbläsaren – proxya via tRPC server-side
- [x] Uppdatera useVielhandlareAPI och useSMHIWeather att anropa tRPC-proxy
- [x] Uppdatera useZoneComparison och useHistoricalPrices på samma sätt
- [x] SMHI 404-fel: bytt till Open-Meteo API (gratis, ingen auth, fungerar server-side)

## CARE Upgrade
- [x] Ladda upp Solpulsen CARE-logotyp till CDN
- [x] Uppdatera global CSS till premium ljust tema (guld, teal, djupa skuggor)
- [x] AI Status Layer (LIVE-puls, AI ACTIVE, Confidence %)
- [x] Animerade KPI-kort (count-up, trend-pil, hover-glow)
- [x] Energy Flow-visualisering (Solar→Battery→Home↔Grid, partikelanimationer)
- [x] AI Action Panel (4 knappar, gradient, pulse-click)
- [x] Referral-sektion (inbjudningslänk, antal, intjänat, progress)
- [x] AI Insights-kort (dynamisk text, glow-border)
- [x] Uppgraderade notiser (färgkodade, vänster bar, timestamp)
- [x] Chart-animationer (smooth load, hover glow, peak highlight)
- [x] Micro-interactions globalt (scale hover, shimmer loading)
- [x] Byt appnamn/titel till Solpulsen CARE

## CARE Platform Transformation
- [x] Kopiera CARE backend-logik (batteryOptimizer, dataFetcher) till server/
- [x] Uppdatera drizzle schema med CARE-tabeller (devices, tickets, contracts, warranties, referrals, notifications, optimization_history)
- [x] Köra DB-migrering för nya tabeller
- [x] Uppdatera routers med CARE-procedurer (devices, tickets, contracts, warranties, referral, notifications, energyData, forecast)
- [x] Bygg sidebar DashboardLayout med 6 sidor: Home, Energy, Devices, Care, Economy, Settings
- [x] Uppdatera App.tsx med nya routes
- [x] HOME: Energy House centerpiece med AI Status, KPI-kort, Energy Flow, AI Insights, Notifications, AI Actions
- [x] ENERGY: Live flow, produktion/förbrukning/batteri/nät-grafer, tidsfilter 24h/7d/30d
- [x] DEVICES: Sol, Batteri, Inverter, Värmepump, EV-laddare, Vind – status + realtidsdata
- [x] CARE: Support tickets, garantier, avtal, referral-system
- [x] ECONOMY: Besparingar, nätintäkter, ROI, AI-optimeringsvärde, Download Report
- [x] SETTINGS: Systemkonfiguration, schemaläggare, notifieringar

## Fas 2 – Alla CARE-sidor + nya features
- [x] ENERGY: Live flow, grafer (produktion/förbrukning/batteri/nät), tidsfilter 24h/48h
- [x] ENERGY: PDF-rapportgenerering (nedladdning direkt från sidan)
- [x] HOME KPI-kort: hover-miniatyrgraf (Sparkline SVG, forecast-data, 24h)
- [x] DEVICES: Sol, Batteri, Inverter, Värmepump, EV-laddare, Vind – status + realtidsdata + quick actions
- [x] CARE: Support tickets, garantier, avtal, referral-system
- [x] ECONOMY: Besparingar, nätintäkter, ROI, AI-optimeringsvärde, Download Report
- [x] SETTINGS: Systemkonfiguration, schemaläggare, notifieringar

## News & AI Insights Engine (Insights Hub)
- [x] Schema: news_articles + ai_insights tabeller, DB-migrering
- [x] Server: RSS-fetcher (5 feeds), HTML-rensning, deduplicering
- [x] Server: AI-processor via invokeLLM (sammanfattning, taggar, relevans, region, insight)
- [x] Server: DB-helpers för articles + insights CRUD
- [x] Server: tRPC-procedurer (news.list, news.top, news.byTag, insights.list, news.refresh)
- [x] Server: Cron-jobb var 30 min (fetchAndProcess pipeline)
- [x] Server: In-memory cache (15 min TTL) på list-queries
- [x] Frontend: Insights Hub sida med stats, filter, artikelkort, AI Insights-panel
- [x] Navigation: Lägg till "Insikter" i sidebar + App.tsx routing
- [x] Tester: Vitest för news-procedurer

## Insights Hub v2 – AI Beslutsmotor
- [x] Schema: action_type, action_text, personalized_insight redan i news_articles + ai_insights
- [x] Expandera RSS-källor: 13 feeds – SE (Svensk Solenergi, Energinyheter, Second Opinion, SVT, Di), Nordics (Montel, Nordic Energy Research), EU (Euractiv, PV Europe), Global (PV Magazine, CleanTechnica, Energy Storage News, Renewables Now)
- [x] Regionklassificering: SE > NORDICS > EU > GLOBAL med prioritetslogik och keyword-detection
- [x] AI-prompt: Svensk/nordisk fokus, personalisering per elområde (SE1-SE4)
- [x] Action-generering: optimize_battery, schedule_charging, view_forecast, monitor_risk
- [x] Nya tRPC-endpoints: news.prioritized, news.relevant, insights.personalized
- [x] Frontend: Regionflaggor (🇸🇪🇳🇴🇪🇺🌍), action-badges, personalized insight-box, region distribution bar
- [x] Frontend: 70/20/10-regel (SE+Nordics/EU/Global) i default-vy via applyRegionDistribution
- [x] Pipeline kör: 62 artiklar hämtade, 28 processade, 8 AI-bearbetade
- [x] Tester: 41 tester passerar (inkl. news.prioritized, news.relevant, insights.personalized)

## Action Engine
- [x] Schema: actions-tabell (id, user_id, insight_id, action_type, action_payload JSON, status enum, executed_at, created_at)
- [x] DB-migrering för actions-tabell
- [x] DB-helpers: createAction, getActions, getUserActions, executeAction, getActionsByInsight
- [x] Trigger-logik: auto-skapa pending action vid relevance_score > 80 + region match
- [x] AI-processing: utöka LLM-prompt att generera action_type + action_payload per insight
- [x] tRPC-endpoints: actions.list, actions.user, actions.execute, actions.approve, actions.byInsight
- [x] executeAction-funktion: uppdatera status, logga executed_at, utbyggbar för device control
- [x] Frontend: "Godkänn åtgärd" + "Kör automatiskt" knappar på varje insight
- [x] Frontend: Actions-lista/panel med status (pending/executed/failed)
- [x] Tester: 50 tester passerar (inkl. 9 action-engine-tester: create, user, execute, approve, dismiss, list, autoTrigger)

## Device Controller – Batteri (KLAR)
- [x] Schema: device_configs + device_logs tabeller, DB-migrering körd
- [x] BatteryController: Solarman OpenAPI (token auth, custom commands), Modbus TCP (RTU-framing, CRC16, Afore-register)
- [x] Safety validation: max SoC 95%, min SoC 10%, max charge/discharge power, tidformat HH:MM
- [x] Modbus frame builder: buildModbusWriteFrame (FC06), buildModbusReadFrame (FC03), CRC16 korrekt
- [x] commandToModbusFrames: start_charging (2 frames), stop_charging (1), set_soc_target (1), schedule_charging (3), get_status (1 read)
- [x] normalizeActionToCommand: optimize_battery→set_soc_target, schedule_charging, sell_excess→set_power_limit, monitor_risk→get_status
- [x] executeAction i db.ts uppdaterad: routar battery-åtgärder via BatteryController, loggar i device_logs
- [x] tRPC deviceControl router: listDevices, createDevice, updateDevice, deleteDevice, executeBatteryCommand, getLogs
- [x] Frontend DeviceControl.tsx: device-formulär (Solarman/Modbus), command panel, exekveringslogg, säkerhetsinfo
- [x] Navigation: "Enhetsstyrning" i sidebar, /device-control route i App.tsx
- [x] Tester: 34 device controller-tester passerar (safety, Modbus frames, normalizeAction), 71 totalt

## Actions History + AI ROI
- [x] Schema: Lägg till baseline_cost_sek, actual_cost_sek, savings_sek, savings_kwh, confidence på actions-tabellen
- [x] Schema: Ny tabell price_timeseries (timestamp, region, price_sek_per_kwh)
- [x] Schema: Ny tabell energy_timeseries (timestamp, user_id, consumption_kwh, production_kwh, battery_charge_kwh, battery_discharge_kwh, grid_import_kwh, grid_export_kwh)
- [x] DB-migrering för ovanstående
- [x] roiService.ts: calculateBaselineCost(), calculateActualCost(), calculateSavings(), confidence-beräkning
- [x] executeAction(): hämta prisdata + energidata, beräkna ROI, spara på action-raden
- [x] tRPC-endpoints: actions.history (from/to filter), actions.roiSummary, actions.roiDaily, actions.roiMonthly
- [x] Frontend: ActionsHistory.tsx med KPI-summary, tidslinje, filter (datum/typ/status), daglig besparingsgraf
- [x] Frontend: Lägg till nav-länk "AI ROI" i DashboardLayout
- [x] Tester för roiService och nya endpoints

## Kundspecifik dokumentuppladdning
- [x] Schema: customer_documents-tabell (id, uploaded_by, target_user_id, filename, file_key, file_url, doc_type, description, file_size, created_at)
- [x] DB-migrering för customer_documents
- [x] Backend: S3-uppladdning via storagePut, tRPC-endpoints (upload, listMine, listForUser, delete)
- [x] Admin-UI: Ladda upp PDF per kund (välj kund, filtyp, beskrivning)
- [x] Kund-UI: Kunden ser bara sina egna dokument i Dokumentcenter
- [x] Tester för upload/list/delete-endpoints

## Dokumentcenter UX + System Health
- [x] Polera dokumentuppladdningsflödet (UX-förbättringar, felhantering, progress)
- [x] Byt kund-ID-input mot dropdown med kundnamn i uppladdningsformuläret
- [x] System Health: system_health + alert_rules tabeller i schema + migration
- [x] System Health: heartbeat, alert-regelmotor, avvikelsedetektering, tRPC-endpoints
- [x] System Health: SystemHealth.tsx sida med enhetsstatus, larm och avvikelsefeed
- [x] Tester och checkpoint för ovanstående

## AI ROI PDF-rapport (Admin per kund)
- [x] Backend: Express GET /api/reports/roi-pdf (auth, admin/self access control, date range)
- [x] Backend: PDF-generering med pdfkit (branded SolPulsen, kundnamn, KPI, åtgärdstabell, footer)
- [x] Frontend: "Ladda ner ROI-rapport" knapp i ActionsHistory.tsx med spinner + browser download
- [x] 121 tester passerar

## ROI PDF Säljverktyg (Uppgradering)
- [x] Beräkna yearly loss: baseline_cost vs actual_cost per kund, visa "Du förlorar X kr/år utan AI"
- [x] Visuell jämförelse Before/After: två kolumner med färgkodade KPI-rutor
- [x] AI-rekommendationssektion: top 3 åtgärder med estimerad besparing
- [x] Emotionell hook: tydlig rubrik + röd siffra för förlust, grön för besparing
- [x] Säljsida sist: SolPulsen kontakt, CARE-tier-erbjudande, QR-kod

## Admin Kundväljare i ActionsHistory
- [x] tRPC-endpoint: users.listAll (admin only) – returnerar id + name + email
- [x] Dropdown i ActionsHistory.tsx (synlig bara för admin) – välj kund
- [x] PDF-knappen skickar ?userId=X baserat på vald kund
- [x] Ingen sidladdning – state-driven

## SLA-timer i CARE
- [x] Schema: lägg till sla_deadline (timestamp) på tickets-tabellen
- [x] DB-migrering för sla_deadline
- [x] Backend: beräkna sla_deadline vid skapande baserat på CARE-tier (Basic 72h, Plus 24h, Platinum 4h)
- [x] Frontend: SlaCountdown-komponent med grön/gul/röd färgstatus
- [x] Visa countdown i ticket-listan och ticket-detaljvy

## E-postnotifieringar (SMTP)
- [x] Installera nodemailer, konfigurera SMTP (prime6.inleed.net:587, STARTTLS)
- [x] emailService.ts: sendMail helper med premium HTML-mall (SolPulsen-branded)
- [x] Trigger: ticket skapad/uppdaterad → mail till kund + admin
- [x] Trigger: AI-åtgärd utförd (status=executed) → mail till kund
- [x] Trigger: ROI-rapport genererad → mail med länk/sammanfattning
- [x] SMTP_USER/SMTP_PASS i secrets

## Kunskapsbas (Knowledge Base)
- [x] Schema: knowledge_articles-tabell (id, title, slug, excerpt, content, category, tags, imageUrl, authorId, published, publishedAt, createdAt, updatedAt)
- [x] DB-migrering för knowledge_articles
- [x] Backend: tRPC-endpoints (articles.list, articles.getBySlug, articles.create, articles.update, articles.delete, articles.publish)
- [x] Admin-UI: Skapa/redigera artiklar med rich text, kategori, taggar, bild-URL, publicera/avpublicera
- [x] Kund-UI: KnowledgeBase.tsx – sök, filtrera per kategori, artikelkort, fullständig artikelvy
- [x] Nav-länk "Kunskapsbas" i DashboardLayout
- [x] Tester för knowledge base endpoints

## Kundportal-onboarding
- [x] Schema: onboarding_progress-tabell (userId, completedSteps JSON, completedAt)
- [x] DB-migrering för onboarding_progress
- [x] Backend: tRPC-endpoints (onboarding.getProgress, onboarding.completeStep, onboarding.dismiss)
- [x] Frontend: OnboardingWizard-komponent (modal/overlay, 4 steg: välkommen, konfigurera system, lägg till enhet, välj CARE-tier)
- [x] Trigger: visa wizard automatiskt vid första inloggning (onboardingCompleted = false)
- [x] Tester för onboarding-endpoints

## Kunskapsbas: Rich Text Editor
- [x] Installera @tiptap/react, @tiptap/starter-kit, @tiptap/extension-image, @tiptap/extension-link
- [x] TiptapEditor-komponent med toolbar (fetstil, kursiv, rubriker H2/H3, lista, länk, bild)
- [x] Byt textarea i ArticleEditorDialog mot TiptapEditor
- [x] Rendera HTML-innehåll i ArticleView (ersätt whitespace-pre-wrap med dangerouslySetInnerHTML)
- [x] Tester för editor-komponent

## Eget Auth-system (bcrypt + JWT) — ersätter Manus OAuth
- [x] bcryptjs redan installerat
- [x] password_hash kolumn redan på users-tabellen
- [x] Auth i routers.ts: bcrypt login, JWT signering via jose
- [x] context.ts: egen JWT-validering + authenticateRequest för REST-routes
- [x] tRPC: auth.login, auth.logout, auth.me, auth.changePassword, auth.forgotPassword, auth.resetPassword
- [x] Login.tsx: CARE-branded, light theme, CARE-logotyp, guldaccenter, /care-public-länk
- [x] DashboardLayout + CarePublic.tsx pekar på /login
- [x] OAuth-callback borttagen från index.ts, sdk-import borttagen från REST-routes, localStorage-nyckel bytt
- [x] Schema: invitations-tabell (redan i drizzle/schema.ts)
- [x] DB-migrering för invitations (redan körd)
- [x] Backend: 46elks SMS-service (sendSms + sendInviteSms i smsService.ts)
- [x] Backend: tRPC-endpoints (invitations.create, list, resend, validate, accept)
- [x] Admin-UI: UserManagement.tsx med inbjudningsformulär + lista
- [x] Inbjudningslänk /invite?token=XYZ → InviteAccept.tsx → kund sätter lösenord
- [x] Tester för invite-endpoints

## Invite-accept + Lösenordsåterställning
- [x] /invite?token=XYZ sida: InviteAccept.tsx (validera token, kund väljer lösenord, aktivera konto)
- [x] Backend: invitations.accept endpoint (validera token, skapa user, sätt lösenord)
- [x] Branded välkomstmail (sendWelcomeEmail) + admin-notifiering till care@solpulsen.se
- [x] Glömt lösenord: ForgotPassword.tsx + auth.forgotPassword endpoint
- [x] Branded återställningsmail (sendPasswordResetEmail, 1h token)
- [x] /reset-password?token=XYZ: ResetPassword.tsx + auth.resetPassword endpoint
- [x] Tester för invite-accept och password reset

## Elfaktura-uppladdning + Påminnelser
- [x] Schema: electricity_bills-tabell
- [x] Schema: bill_reminders-tabell
- [x] DB-migrering för electricity_bills + bill_reminders
- [x] Backend: S3-upload, tRPC-endpoints (bills.upload, list, delete, setReminder, reminders, analyze)
- [x] Frontend: ElectricityBills.tsx — drag-and-drop upload, fakturalista, påminnelsedatum-väljare, AI-analys
- [x] Nav-länk "Elfaktura" i DashboardLayout
- [x] Cron-jobb: var 15 min, skicka e-post (alla) + SMS (plus/platinum) vid förfallodatum
- [x] Admin-vy: se alla kunders fakturor (admin user-filter i ElectricityBills.tsx)

## Kund-profil-sida
- [x] Frontend: Profile.tsx — CARE-nivå, byta lösenord, uppdatera namn/telefon
- [x] Backend: auth.updateProfile endpoint
- [x] Nav-länk "Min profil" i DashboardLayout

## Admin-notifiering vid ny kund
- [x] invitations.accept: skicka mail till care@solpulsen.se med kundens namn och CARE-nivå (redan implementerat)

## AI-analys av elfaktura + CARE-uppgradering
- [x] Backend: bills.analyze tRPC-endpoint med LLM-extraktion (kWh, kostnad, nätavgifter, besparingspotential)
- [x] DB: analysJson + analyzedAt kolumner på electricity_bills
- [x] Frontend: ElectricityBills.tsx visar AI-analys med KPI-kort och besparingspotential
- [x] Frontend: CareUpgradeSection.tsx – jämförelsevy nuvarande vs nästa CARE-nivå, Uppgradera-knapp (integrerad i Care.tsx SupportTab)
- [x] Backend: care.requestUpgrade tRPC-endpoint skapar supportticket med uppgraderingsförfrågan
- [x] Nav-länk "Uppgradera CARE" i DashboardLayout (synlig för kunder) — integrerat direkt i CARE Support-flödet

## CARE Public Landing Page

- [x] Route /care-public i App.tsx (ingen DashboardLayout)
- [x] Design tokens: light theme CSS-variabler
- [x] Google Fonts: Playfair Display + Inter
- [x] Sektion 1: Hero — split layout, headline, 3 CTAs
- [x] Sektion 2: Why CARE Exists — editorial text
- [x] Sektion 3: What CARE Includes — 4 feature cards
- [x] Sektion 4: CARE Packages — 3 tiers (Basic/Silver/Platinum), Platinum highlighted
- [x] Sektion 5: Re-CARE — abandoned systems takeover
- [x] Sektion 6: Content/Media hub — 6 riktiga Solpulsen YouTube-videor med lightbox
- [x] Sektion 7: Benefits/Referral — rewards, 15 000 SEK Platinum
- [x] Sektion 8: Support/Contact — form, phone, email, response times
- [x] Sektion 9: Login CTA — Already a CARE member?
- [x] Sektion 10: Footer — clean, premium, minimal

## CARE Public Entry Flow

- [x] Routing: /care-public som default för utloggade besökare, inloggade → direkt till /dashboard
- [x] Backend: contactForm.submit tRPC-endpoint (publicProcedure) — skapar ticket + e-post till care@solpulsen.se + bekräftelse till kund
- [x] Frontend: Koppla kontaktformuläret i CarePublic.tsx till live tRPC mutation (loading/success/error)
- [x] Assets: Riktiga Solpulsen YouTube-thumbnails + CDN-logo + YouTube lightbox
- [x] Copy: Genomgång och skärpning av all publik CARE-text (trust, Re-CARE, paket, referral)

## CARE Public Page — Final Premium Conversion Upgrade

- [x] Ny CARE-logotyp (4K) uppladdad till CDN och integrerad i navbar + footer
- [x] Hero: ny headline "AI, trygghet och optimering", starkare proof points, bättre value communication
- [x] Why CARE Exists: 3 premium-kort (installatörer försvinner, kontinuerlig vård, långsiktig partner)
- [x] What CARE Includes: 8 feature-kort (liveövervakning, AI-optimering, rapporter, support, garanti, faktura, referral, pilot)
- [x] Packages: skärpt copy, Platinum dominant, REKOMMENDERAS badge
- [x] Re-CARE: starkare copy, premium statuskort
- [x] Contact: ny headline "Få en analys av ditt system", starkare subheadline
- [x] Member CTA: "Logga in på CARE-portalen" + "Bli CARE-kund"
- [x] Footer: CARE-logotyp, raffinerad layout
- [x] SEO: title, meta description, Open Graph tags (react-helmet-async)
- [x] Ta bort Media Hub och Benefits/Referral sektioner (ersatta av starkare features + packages)

## CARE Public — Sista konverteringslyftet

- [x] Logga: öka visuell storlek 20-25% i navbar (44→56px) + footer (48→60px), bättre spacing, högre navbar (72→80px)
- [x] Hero-copy: "Se besparing, produktion och AI-rekommendationer i realtid" + konkret värdekoppling
- [x] CTA: bytt "Få hjälp nu" → "Boka genomgång"
- [x] Trust/proof: SocialProof-bar med 3 trust-element (flera fabrikat, lämnade utan support, långsiktig drift)
- [x] Hero-kort: live-puls animation, "Live just nu", AI-rekommendation med guldram + "+67 kr besparing" i grönt
- [x] Kontaktsektion: trust-rad under formuläret ("Vi återkommer med rätt nästa steg...")

## GDPR & Cookie Consent
- [x] CookieConsent.tsx komponent (premium minimal design, localStorage persistence)
- [x] Integrerad i App.tsx

## Fas 3 — Larmregler, Schemaläggare & E-post ärendehantering
- [x] Larmregler UI i Settings — lista, skapa, redigera, ta bort alert_rules
- [x] Schemaläggare UI i Settings — fullständigt formulär för schedulerConfigs
- [x] IMAP-poller — läser care@solpulsen.se var 5 min, skapar tickets automatiskt
- [x] E-post → ticket pipeline — ämne=titel, body=beskrivning, avsändare=kund
- [x] Svara på ticket via portal → skickar mejl tillbaka till kunden (noreply@solpulsen.se)
- [x] Notifiering till admin när nytt mejl-ärende kommer in
- [x] Ticket-märkning "via e-post" för att skilja från manuella ärenden

## Admin E-post Inbox
- [x] Backend: tickets.emailInbox endpoint — returnerar alla email-tickets grupperade per avsändare
- [x] Frontend: EmailInbox.tsx — admin-vy med gruppering, filter, statistik
- [x] Navigation: "E-post Inbox" i sidebar (adminOnly)
- [x] Route: /email-inbox i App.tsx
- [ ] Tester för emailInbox endpoint
