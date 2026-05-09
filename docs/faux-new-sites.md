# Faux data: Add New Site (`/protected/studies/[id]/sites/new`)

Fictional values for **manual copy-paste** into **SiteForm** ([components/ctms/sites/site-form.tsx](components/ctms/sites/site-form.tsx)). **Required** fields per Zod: `site_number`, `name`. **Status** must be one of: `identified` | `selected` | `initiated` | `activated` | `enrolling` | `closed` (UI labels: Identified, Selected, Initiated, Activated, Enrolling, Closed).

**Associated Study Country** stores `study_country_id` (UUID). After you add countries to the study, open the dropdown and pick the row that matches the **intended country** in the table below—replace the placeholder ID in the “Form values (machine)” section with your real UUID from the DB/UI.

**Activation Date** appears only when **Status** is **Activated**; use HTML date format **`YYYY-MM-DD`**.

Address fields work with **Google Places** autocomplete; the strings below are realistic manual entries if you type instead of picking a place.

---

## Site 1 — US (academic)

| Field | Value |
| --- | --- |
| **Site Number** | US-101 |
| **Site Name** | Meridian Clinical Research Center |
| **Associated Study Country** | United States (US) — *pick matching row in app* |
| **Status** | identified |
| **Address** | 1800 Lakeside Drive |
| **City** | Boston |
| **State / Province** | MA |
| **Postal Code** | 02115 |
| **Target Enrollment** | 18 |
| **Activation Date** | — *(omit unless status is Activated)* |

---

## Site 2 — US (community hospital)

| Field | Value |
| --- | --- |
| **Site Number** | US-102 |
| **Site Name** | Harborview Medical Associates — Phase II Unit |
| **Associated Study Country** | United States (US) |
| **Status** | selected |
| **Address** | 4500 Pacific Avenue |
| **City** | Seattle |
| **State / Province** | WA |
| **Postal Code** | 98144 |
| **Target Enrollment** | 12 |

---

## Site 3 — Canada

| Field | Value |
| --- | --- |
| **Site Number** | CA-201 |
| **Site Name** | St. Laurent Dermatology Institute |
| **Associated Study Country** | Canada (CA) |
| **Status** | initiated |
| **Address** | 2200 Rue Sherbrooke Ouest |
| **City** | Montréal |
| **State / Province** | QC |
| **Postal Code** | H3H 1G1 |
| **Target Enrollment** | 14 |

---

## Site 4 — Canada

| Field | Value |
| --- | --- |
| **Site Number** | CA-202 |
| **Site Name** | Calgary Hills Investigational Site |
| **Associated Study Country** | Canada (CA) |
| **Status** | activated |
| **Address** | 1400 9 Avenue NW |
| **City** | Calgary |
| **State / Province** | AB |
| **Postal Code** | T2N 1J9 |
| **Target Enrollment** | 10 |
| **Activation Date** | 2026-04-01 |

---

## Site 5 — Germany

| Field | Value |
| --- | --- |
| **Site Number** | DE-301 |
| **Site Name** | Universitätsklinikum Rhein-Mitte — Hautklinik |
| **Associated Study Country** | Germany (DE) |
| **Status** | enrolling |
| **Address** | Langenbeckstraße 1 |
| **City** | Mainz |
| **State / Province** | RP |
| **Postal Code** | 55131 |
| **Target Enrollment** | 22 |

---

## Site 6 — Germany

| Field | Value |
| --- | --- |
| **Site Number** | DE-302 |
| **Site Name** | Charité Campus Mitte — Trial Unit (fictional suite) |
| **Associated Study Country** | Germany (DE) |
| **Status** | identified |
| **Address** | Charitéplatz 1 |
| **City** | Berlin |
| **State / Province** | BE |
| **Postal Code** | 10117 |
| **Target Enrollment** | 16 |

---

## Site 7 — Poland

| Field | Value |
| --- | --- |
| **Site Number** | PL-401 |
| **Site Name** | Centrum Badań Klinicznych “Novamed” |
| **Associated Study Country** | Poland (PL) |
| **Status** | selected |
| **Address** | ul. Marszałkowska 100 |
| **City** | Warszawa |
| **State / Province** | Mazowieckie |
| **Postal Code** | 00-102 |
| **Target Enrollment** | 20 |

---

## Site 8 — Poland

| Field | Value |
| --- | --- |
| **Site Number** | PL-402 |
| **Site Name** | Kraków Academic Hospital — Derm RCT Suite |
| **Associated Study Country** | Poland (PL) |
| **Status** | initiated |
| **Address** | ul. Kopernika 50 |
| **City** | Kraków |
| **State / Province** | Małopolskie |
| **Postal Code** | 31-501 |
| **Target Enrollment** | 14 |

---

## Site 9 — US (high enrollment target)

| Field | Value |
| --- | --- |
| **Site Number** | US-103 |
| **Site Name** | Southeast Dermatology Research Network |
| **Associated Study Country** | United States (US) |
| **Status** | enrolling |
| **Address** | 333 Peachtree Street NE |
| **City** | Atlanta |
| **State / Province** | GA |
| **Postal Code** | 30308 |
| **Target Enrollment** | 28 |

---

## Site 10 — Closed / wind-down test row

| Field | Value |
| --- | --- |
| **Site Number** | US-199 |
| **Site Name** | Legacy Pines Clinic — *(closed pilot location)* |
| **Associated Study Country** | United States (US) |
| **Status** | closed |
| **Address** | 88 Willow Creek Road |
| **City** | Portland |
| **State / Province** | OR |
| **Postal Code** | 97205 |
| **Target Enrollment** | 0 |

---

## Form values (machine-oriented)

Optional keys accepted by the same Zod schema / server action but **not shown** on the current Site Information / Location / Enrollment cards: `pi_name`, `pi_email`. Omit or leave empty in the UI unless you extend the form.

```json
[
  {"site_number":"US-101","name":"Meridian Clinical Research Center","study_country_id":"<UUID-US>","address":"1800 Lakeside Drive","city":"Boston","state":"MA","postal_code":"02115","status":"identified","activation_date":"","target_enrollment":18},
  {"site_number":"US-102","name":"Harborview Medical Associates — Phase II Unit","study_country_id":"<UUID-US>","address":"4500 Pacific Avenue","city":"Seattle","state":"WA","postal_code":"98144","status":"selected","activation_date":"","target_enrollment":12},
  {"site_number":"CA-201","name":"St. Laurent Dermatology Institute","study_country_id":"<UUID-CA>","address":"2200 Rue Sherbrooke Ouest","city":"Montréal","state":"QC","postal_code":"H3H 1G1","status":"initiated","activation_date":"","target_enrollment":14},
  {"site_number":"CA-202","name":"Calgary Hills Investigational Site","study_country_id":"<UUID-CA>","address":"1400 9 Avenue NW","city":"Calgary","state":"AB","postal_code":"T2N 1J9","status":"activated","activation_date":"2026-04-01","target_enrollment":10},
  {"site_number":"DE-301","name":"Universitätsklinikum Rhein-Mitte — Hautklinik","study_country_id":"<UUID-DE>","address":"Langenbeckstraße 1","city":"Mainz","state":"RP","postal_code":"55131","status":"enrolling","activation_date":"","target_enrollment":22},
  {"site_number":"DE-302","name":"Charité Campus Mitte — Trial Unit (fictional suite)","study_country_id":"<UUID-DE>","address":"Charitéplatz 1","city":"Berlin","state":"BE","postal_code":"10117","status":"identified","activation_date":"","target_enrollment":16},
  {"site_number":"PL-401","name":"Centrum Badań Klinicznych \"Novamed\"","study_country_id":"<UUID-PL>","address":"ul. Marszałkowska 100","city":"Warszawa","state":"Mazowieckie","postal_code":"00-102","status":"selected","activation_date":"","target_enrollment":20},
  {"site_number":"PL-402","name":"Kraków Academic Hospital — Derm RCT Suite","study_country_id":"<UUID-PL>","address":"ul. Kopernika 50","city":"Kraków","state":"Małopolskie","postal_code":"31-501","status":"initiated","activation_date":"","target_enrollment":14},
  {"site_number":"US-103","name":"Southeast Dermatology Research Network","study_country_id":"<UUID-US>","address":"333 Peachtree Street NE","city":"Atlanta","state":"GA","postal_code":"30308","status":"enrolling","activation_date":"","target_enrollment":28},
  {"site_number":"US-199","name":"Legacy Pines Clinic — (closed pilot location)","study_country_id":"<UUID-US>","address":"88 Willow Creek Road","city":"Portland","state":"OR","postal_code":"97205","status":"closed","activation_date":"","target_enrollment":0}
]
```

---

*All institutions and addresses are fabrications for local testing and demos.*
