--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8 (Homebrew)
-- Dumped by pg_dump version 16.8 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, name, password, role, department, phone, avatar, "isActive", "lastLoginAt", "createdAt", "updatedAt", "invitationCode", "invitationCount", bio, "isPublic", "lineId", "position", specialties) FROM stdin;
cmhwrrkpp00018g3mt2pozfcn	owner@youshi-hr.com	陳董事長	$2b$10$L0aRdJPrXaIAinTKT6mt8uKJWcK8LpeP/wZxB4z3Vsm11YIVuPSXa	OWNER	經營管理	0912-111-111	\N	t	\N	2025-11-13 01:47:43.645	2025-11-24 13:00:07.843	QTH6Q9PW	0	\N	t	\N	\N	\N
cmhwrrkrl00028g3m5j23vrim	staff1@youshi-hr.com	王業務	$2b$10$LIhddpd/Ji9kPh/JDFGk4.G8oUYfbWn5hnW5aLQpRpE61oMSPfdCm	STAFF	業務一部	0912-222-222	\N	t	\N	2025-11-13 01:47:43.714	2025-11-24 13:00:07.854	YFCV77S6	0	\N	t	\N	\N	\N
cmhwrrktg00038g3mjr0tz8xi	staff2@youshi-hr.com	李專員	$2b$10$korIdz0P7q3cIj2LG9QrOONCoyO8rkg1bFHHSVNfRaAJ83lTpvUeW	STAFF	業務二部	0912-333-333	\N	t	\N	2025-11-13 01:47:43.78	2025-11-24 13:00:07.856	UZZ9MCAV	0	\N	t	\N	\N	\N
cmhwrrknb00008g3mhh2zbiow	admin@youshi-hr.com	系統管理員	$2b$10$PyI//oRG.pO16TqWh/76muWOAp47TOtJxwXpF5X2MqTE5k5CaSuPW	SUPER_ADMIN	資訊部	0912-345-678	\N	t	2025-11-29 08:30:45.861	2025-11-13 01:47:43.558	2025-11-29 08:30:45.862	\N	0	\N	t	\N	\N	\N
\.


--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ActivityLog" (id, "userId", action, entity, "entityId", details, "ipAddress", "userAgent", "createdAt") FROM stdin;
1	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@manpower.com"}	\N	\N	2025-11-14 09:55:29.05
2	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@manpower.com"}	\N	\N	2025-11-14 10:07:47.577
3	cmhwrrknb00008g3mhh2zbiow	login_failed	user	cmhwrrknb00008g3mhh2zbiow	{"email": "admin@manpower.com", "reason": "invalid_password"}	\N	\N	2025-11-14 10:49:55.012
4	cmhwrrknb00008g3mhh2zbiow	login_failed	user	cmhwrrknb00008g3mhh2zbiow	{"email": "admin@manpower.com", "reason": "invalid_password"}	\N	\N	2025-11-14 10:49:57.532
5	cmhwrrknb00008g3mhh2zbiow	login_failed	user	cmhwrrknb00008g3mhh2zbiow	{"email": "admin@manpower.com", "reason": "invalid_password"}	\N	\N	2025-11-14 10:50:02.815
6	cmhwrrknb00008g3mhh2zbiow	login_failed	user	cmhwrrknb00008g3mhh2zbiow	{"email": "admin@manpower.com", "reason": "invalid_password"}	\N	\N	2025-11-14 10:50:46.992
7	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@manpower.com"}	\N	\N	2025-11-14 10:50:51.753
8	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@manpower.com"}	\N	\N	2025-11-14 11:05:03.824
9	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@manpower.com"}	\N	\N	2025-11-14 11:11:02.085
10	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-14 11:37:21.723
11	cmhwrrknb00008g3mhh2zbiow	logout	user	cmhwrrknb00008g3mhh2zbiow	\N	\N	\N	2025-11-14 12:04:34.927
12	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-14 12:04:42.674
13	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-14 12:05:13.151
14	cmhwrrknb00008g3mhh2zbiow	logout	user	cmhwrrknb00008g3mhh2zbiow	\N	\N	\N	2025-11-14 12:06:36.535
15	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-14 12:06:49.907
16	cmhwrrknb00008g3mhh2zbiow	logout	user	cmhwrrknb00008g3mhh2zbiow	\N	\N	\N	2025-11-14 12:10:17.64
17	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-14 12:10:27.704
18	cmhwrrknb00008g3mhh2zbiow	logout	user	cmhwrrknb00008g3mhh2zbiow	\N	\N	\N	2025-11-14 12:13:17.323
19	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-14 12:13:24.786
20	cmhwrrknb00008g3mhh2zbiow	logout	user	cmhwrrknb00008g3mhh2zbiow	\N	\N	\N	2025-11-14 12:16:05.895
21	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-14 12:16:14.667
22	cmhwrrknb00008g3mhh2zbiow	logout	user	cmhwrrknb00008g3mhh2zbiow	\N	\N	\N	2025-11-14 12:31:59.074
23	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-14 12:32:06.701
24	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-17 07:08:42.356
25	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-24 10:14:22.251
26	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-25 02:01:38.48
27	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-27 01:01:06.289
28	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-29 08:30:45.89
\.


--
-- Data for Name: Analytics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Analytics" (id, event, category, action, label, value, "userId", "sessionId", "ipAddress", "userAgent", referrer, data, "createdAt") FROM stdin;
\.


--
-- Data for Name: ContractTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ContractTemplate" (id, name, type, content, variables, "isActive", "createdAt", "updatedAt") FROM stdin;
1	勞動契約書	employment	\n勞動契約書\n\n甲方（雇主）：{{employer_name}}\n統一編號：{{employer_id}}\n地址：{{employer_address}}\n\n乙方（員工）：{{employee_name}}\n身分證字號：{{employee_id}}\n地址：{{employee_address}}\n\n茲經雙方同意訂立本契約，條款如下：\n\n第一條 工作內容\n乙方同意擔任 {{position}} 職務，工作內容為 {{job_description}}。\n\n第二條 工作時間\n每日工作時間為 {{work_hours}} 小時，每週工作 {{work_days}} 天。\n\n第三條 薪資待遇\n月薪新台幣 {{salary}} 元整，於每月 {{pay_day}} 日發放。\n\n第四條 契約期間\n本契約自 {{start_date}} 起至 {{end_date}} 止。\n\n甲方簽章：________________\n乙方簽章：________________\n\n中華民國    年    月    日\n      	{"salary": "月薪", "pay_day": "發薪日", "end_date": "結束日期", "position": "職位", "work_days": "每週工作天數", "start_date": "開始日期", "work_hours": "每日工時", "employee_id": "身分證字號", "employer_id": "統一編號", "employee_name": "員工姓名", "employer_name": "公司名稱", "job_description": "工作內容", "employee_address": "員工地址", "employer_address": "公司地址"}	t	2025-11-13 01:47:43.806	2025-11-13 01:47:43.806
2	服務合約書	service	\n服務合約書\n\n甲方（服務提供方）：{{provider_name}}\n乙方（客戶）：{{client_name}}\n\n服務項目：{{service_type}}\n服務期間：{{service_period}}\n服務費用：新台幣 {{service_fee}} 元整\n\n特別約定事項：\n{{special_terms}}\n\n甲方簽章：________________\n乙方簽章：________________\n\n中華民國    年    月    日\n      	{"client_name": "客戶名稱", "service_fee": "服務費用", "service_type": "服務類型", "provider_name": "服務提供方", "special_terms": "特別約定", "service_period": "服務期間"}	t	2025-11-13 01:47:43.808	2025-11-13 01:47:43.808
3	加盟合約書	franchise	\n加盟合約書\n\n甲方（總部）：{{franchisor_name}}\n乙方（加盟主）：{{franchisee_name}}\n\n加盟地區：{{franchise_location}}\n加盟金：新台幣 {{franchise_fee}} 元整\n權利金：營業額 {{royalty_rate}}%\n\n合約期限：{{contract_period}} 年\n\n甲方簽章：________________\n乙方簽章：________________\n\n中華民國    年    月    日\n      	{"royalty_rate": "權利金比例", "franchise_fee": "加盟金", "contract_period": "合約年限", "franchisee_name": "加盟主姓名", "franchisor_name": "總部名稱", "franchise_location": "加盟地區"}	t	2025-11-13 01:47:43.809	2025-11-13 01:47:43.809
\.


--
-- Data for Name: Contract; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Contract" (id, "templateId", "contractNo", title, content, parties, status, "validFrom", "validUntil", "signedAt", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FormTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FormTemplate" (id, name, type, description, fields, settings, "isActive", "createdAt", "updatedAt") FROM stdin;
1	求職應徵表	job	一般求職者應徵表單	{"sections": [{"title": "基本資料", "fields": [{"name": "name", "type": "text", "label": "姓名", "required": true}, {"name": "email", "type": "email", "label": "Email", "required": true}, {"name": "phone", "type": "tel", "label": "電話", "required": true}, {"name": "birthdate", "type": "date", "label": "出生日期", "required": true}]}, {"title": "應徵資訊", "fields": [{"name": "position", "type": "select", "label": "應徵職位", "options": ["看護人員", "居家照護", "機構照護", "行政人員"], "required": true}, {"name": "experience", "type": "textarea", "label": "工作經驗", "required": true}, {"name": "resume", "type": "file", "label": "履歷檔案", "required": true}]}]}	{"autoResponse": true, "notifications": {"sms": false, "email": ["hr@manpower.com"]}}	t	2025-11-13 01:47:43.801	2025-11-13 01:47:43.801
2	企業需求表	company	企業人力需求登記表	{"sections": [{"title": "企業資訊", "fields": [{"name": "companyName", "type": "text", "label": "公司名稱", "required": true}, {"name": "contactPerson", "type": "text", "label": "聯絡人", "required": true}, {"name": "email", "type": "email", "label": "Email", "required": true}, {"name": "phone", "type": "tel", "label": "聯絡電話", "required": true}]}, {"title": "需求資訊", "fields": [{"name": "serviceType", "type": "select", "label": "服務類型", "options": ["外籍看護", "本國看護", "居家照護", "機構派遣"], "required": true}, {"name": "quantity", "type": "number", "label": "需求人數", "required": true}, {"name": "requirements", "type": "textarea", "label": "詳細需求", "required": true}]}]}	{"notifications": {"sms": true, "email": ["sales@manpower.com"]}}	t	2025-11-13 01:47:43.803	2025-11-13 01:47:43.803
3	加盟申請表	franchise	加盟合作申請表單	{"sections": [{"title": "申請人資料", "fields": [{"name": "name", "type": "text", "label": "姓名", "required": true}, {"name": "email", "type": "email", "label": "Email", "required": true}, {"name": "phone", "type": "tel", "label": "電話", "required": true}, {"name": "location", "type": "text", "label": "希望加盟地區", "required": true}]}, {"title": "背景資訊", "fields": [{"name": "experience", "type": "textarea", "label": "相關經驗", "required": true}, {"name": "investment", "type": "select", "label": "投資預算", "options": ["100-300萬", "300-500萬", "500-1000萬", "1000萬以上"], "required": true}, {"name": "motivation", "type": "textarea", "label": "加盟動機", "required": true}]}]}	{"notifications": {"sms": true, "email": ["franchise@manpower.com"]}, "requireApproval": true}	t	2025-11-13 01:47:43.804	2025-11-13 01:47:43.804
4	聯絡我們	contact	一般聯絡表單	{"sections": [{"title": "聯絡資訊", "fields": [{"name": "name", "type": "text", "label": "姓名", "required": true}, {"name": "email", "type": "email", "label": "Email", "required": true}, {"name": "phone", "type": "tel", "label": "電話", "required": false}, {"name": "subject", "type": "text", "label": "主旨", "required": true}, {"name": "message", "type": "textarea", "label": "訊息內容", "required": true}]}]}	{"autoResponse": true, "notifications": {"email": ["info@manpower.com"]}}	t	2025-11-13 01:47:43.805	2025-11-13 01:47:43.805
\.


--
-- Data for Name: FormSubmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FormSubmission" (id, "templateId", "formType", data, status, notes, "submitterName", "submitterEmail", "submitterPhone", "ipAddress", "processedAt", "processedBy", "createdAt", "updatedAt", "createdById") FROM stdin;
\.


--
-- Data for Name: Attachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Attachment" (id, filename, "originalName", "mimeType", size, path, url, "formId", "contractId", "uploadedBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: ContentBlock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ContentBlock" (id, key, payload, "createdAt", "updatedAt") FROM stdin;
2	logo	{"main": "", "footer": "", "favicon": ""}	2025-11-14 11:06:40.077	2025-11-14 11:06:40.077
1	homePage	{"hero": {"badge": "專業外籍勞工仲介", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuD-q5MC8lSOtjm5jds_NVEfwmrmueqgr9iiW4ck6RHwOTdoV-HPSXi25zLjSZMo4knk3WpkwD0vKirIeyCRXAjWSqhBXUEk8vc97jkGLY-P9pJZsWaorzrGp93KHmPfYe6Vg-mpOfgj3cIXUfiImRKHKzi5FzUQXM6jicXDJonBG6NDFm5Z_iw_iE_sJvPVLflrW-M21w5PqLlZ9UEsHsfUgZa_-814pGT1K0tOYI3ONYmWfeUxWLNxgp8hYucFdVJVxL430EKvwnM", "title": "連接全球人才，驅動您的業務增長", "primaryCTA": {"link": "#", "text": "尋找員工"}, "description": "我們專注於為您的企業引進可靠、技術嫻熟的國際勞工，提供從招聘到安頓的全方位支持，確保無縫對接。", "secondaryCTA": {"link": "#", "text": "我要找工作"}}, "header": {"logo": {"icon": "groups", "text": "全球人才橋樑"}, "navigation": [{"link": "#", "label": "雇主服務"}, {"link": "#", "label": "尋找工作"}, {"link": "#", "label": "關於我們"}, {"link": "#", "label": "資源中心"}], "contactButton": {"link": "#", "text": "聯絡我們"}}}	2025-11-13 03:45:02.864	2025-11-14 11:47:01.54
4	newsPage	{"hero": {"title": "最新消息", "description": "掌握最新的產業動態、政策更新和成功案例分享"}, "newsList": [{"date": "2024-01-10", "link": "/news/manufacturing-labor-shortage", "image": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop", "title": "製造業缺工問題持續，外籍勞工需求創新高", "excerpt": "根據最新統計，製造業缺工人數突破10萬人，外籍勞工引進成為企業解決人力短缺的重要途徑。", "category": "產業新聞"}, {"date": "2024-01-05", "link": "/news/multicultural-workplace", "image": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop", "title": "成功案例分享：如何建立友善的多元文化職場", "excerpt": "訪問三家成功引進外籍勞工的企業，分享他們如何打造包容性的工作環境。", "category": "成功案例"}], "categories": ["全部", "政策公告", "產業新聞", "成功案例", "活動訊息"], "featuredNews": {"date": "2024-01-15", "link": "/news/2024-new-regulations", "image": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=500&fit=crop", "title": "2024年外籍勞工新制上路", "excerpt": "勞動部宣布新的外籍勞工管理辦法，簡化申請流程並提高配額上限。了解新制如何影響您的企業。", "category": "政策公告"}}	2025-11-23 08:09:20.484	2025-11-24 11:48:29.738
5	applicationProcessPage	{"hero": {"image": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=600&fit=crop", "title": "申請流程", "description": "簡單四步驟，讓我們協助您找到最合適的人才"}, "steps": [{"icon": "description", "title": "提出需求", "number": 1, "description": "填寫您的人力需求表單，告訴我們您需要的人才類型"}, {"icon": "people_alt", "title": "人才配對", "number": 2, "description": "我們根據您的需求，從資料庫中篩選最適合的候選人"}, {"icon": "videocam", "title": "面試安排", "number": 3, "description": "安排視訊或現場面試，讓您親自與候選人溝通"}, {"icon": "handshake", "title": "簽約入職", "number": 4, "description": "確認人選後，我們協助辦理所有法律文件與入職手續"}], "categories": [{"id": "caregiver", "icon": "elderly", "name": "看護工", "color": "from-blue-500 to-cyan-500", "steps": [{"icon": "fact_check", "title": "資格審查", "number": 1, "description": "確認申請者符合看護工基本資格，包括年齡、健康狀況、無犯罪紀錄等"}, {"icon": "verified", "title": "證照驗證", "number": 2, "description": "審核相關照護證照、醫療訓練證明，確保專業能力"}, {"icon": "psychology", "title": "專業面試", "number": 3, "description": "由專業照護主管進行面試，評估照護技能與溝通能力"}, {"icon": "school", "title": "職前訓練", "number": 4, "description": "提供專業照護技能培訓，包括基本醫療知識、照護技巧等"}, {"icon": "handshake", "title": "簽約媒合", "number": 5, "description": "完成訓練後，媒合適合的照護對象並簽署勞動契約"}], "description": "專業照護服務人員申請流程"}, {"id": "domestic-helper", "icon": "home_work", "name": "幫傭", "color": "from-purple-500 to-pink-500", "steps": [{"icon": "badge", "title": "基本資料審核", "number": 1, "description": "確認申請者年滿18歲、健康證明、良民證等基本文件"}, {"icon": "star", "title": "經驗評估", "number": 2, "description": "了解過往家務工作經驗、專長技能（烹飪、清潔、育兒等）"}, {"icon": "task_alt", "title": "面試與技能測試", "number": 3, "description": "實地面試並進行簡單的家務技能測試"}, {"icon": "connect_without_contact", "title": "僱主媒合", "number": 4, "description": "根據技能與需求，媒合適合的僱主家庭"}, {"icon": "edit_document", "title": "簽約上工", "number": 5, "description": "與僱主簽訂僱傭契約，確認工作內容、薪資與工時"}], "description": "家務管理專家申請流程"}, {"id": "factory-worker", "icon": "precision_manufacturing", "name": "廠工", "color": "from-orange-500 to-red-500", "steps": [{"icon": "description", "title": "需求登記", "number": 1, "description": "填寫個人基本資料、工作經驗、期望薪資與工作地點"}, {"icon": "health_and_safety", "title": "體能與健康檢查", "number": 2, "description": "進行基本體能測試與健康檢查，確保可勝任工廠作業"}, {"icon": "engineering", "title": "技能評估", "number": 3, "description": "評估生產線操作、品質檢驗、設備使用等相關技能"}, {"icon": "factory", "title": "工廠媒合", "number": 4, "description": "根據技能與地點偏好，媒合合適的製造業工廠"}, {"icon": "work", "title": "入職報到", "number": 5, "description": "完成勞動契約簽署、安全教育訓練，正式入職"}], "description": "製造業人才申請流程"}, {"id": "construction-worker", "icon": "construction", "name": "營造工", "color": "from-yellow-600 to-orange-600", "steps": [{"icon": "workspace_premium", "title": "證照資格審查", "number": 1, "description": "確認相關營造證照（如職業安全衛生教育訓練證明）"}, {"icon": "build", "title": "專業技能驗證", "number": 2, "description": "評估土木、建築、水電等專業技術能力"}, {"icon": "security", "title": "安全訓練", "number": 3, "description": "進行工地安全教育訓練，確保工作安全意識"}, {"icon": "apartment", "title": "工程媒合", "number": 4, "description": "根據專長媒合建築工程專案（如鋼筋、模板、土木等）"}, {"icon": "how_to_reg", "title": "簽約進場", "number": 5, "description": "簽署工程承攬契約，辦理工地進場手續"}], "description": "建築專業人員申請流程"}, {"id": "nursing-home", "icon": "local_hospital", "name": "養護機構", "color": "from-green-500 to-emerald-500", "steps": [{"icon": "medical_information", "title": "專業證照審核", "number": 1, "description": "確認照護相關證照（如照顧服務員證照、護理師執照等）"}, {"icon": "history_edu", "title": "照護經驗評估", "number": 2, "description": "評估在長照機構、安養中心、護理之家的工作經驗"}, {"icon": "groups", "title": "專業面試", "number": 3, "description": "由機構主管進行面試，評估照護能力與團隊合作精神"}, {"icon": "menu_book", "title": "機構訓練", "number": 4, "description": "接受機構內部訓練，熟悉工作流程與照護標準"}, {"icon": "approval", "title": "正式聘僱", "number": 5, "description": "簽署勞動契約，成為養護機構正式員工"}], "description": "專業照護團隊申請流程"}], "contactCTA": {"title": "準備開始了嗎？？", "buttonLink": "/contact", "buttonText": "聯絡我們", "description": "立即聯繫我們，讓專業團隊為您服務"}}	2025-11-24 10:16:54.302	2025-11-25 02:12:59.754
7	workersPage	{"hero": {"image": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&h=600&fit=crop", "title": "優質人才庫", "description": "瀏覽我們精選的專業人才，選擇最適合您企業的員工"}, "workers": [{"id": "W001", "age": 28, "name": "Maria Santos", "photo": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop", "gender": "女", "skills": ["品質檢驗", "機械操作", "團隊合作"], "country": "菲律賓", "category": "製造業", "languages": ["中文", "英文", "他加祿語"], "experience": "5年工廠經驗", "description": "具備豐富的工廠生產線經驗，熟悉品質管理流程。", "availability": "即時可上工"}, {"id": "W002", "age": 32, "name": "Nguyen Van A ", "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", "gender": "男", "skills": ["鋼筋綁紮", "模板施工", "工地安全"], "country": "越南", "category": "營建業", "languages": ["中文", "越南語"], "experience": "8年營建經驗", "description": "擁有多項營建證照，工作態度認真負責。", "availability": "一個月內"}], "ctaSection": {"title": "沒有找到合適的人選？", "buttonLink": "/contact", "buttonText": "聯絡專員", "description": "告訴我們您的特殊需求，我們將為您客製化搜尋人才"}, "filterOptions": {"genders": ["男", "女", "不限"], "countries": ["菲律賓", "越南", "印尼", "泰國"], "categories": ["製造業", "營建業", "服務業", "農業", "漁業"]}}	2025-11-24 10:17:17.084	2025-11-24 11:14:38.417
3	faqPage	{"faqs": [{"answer": "一般來說，從提出申請到人員入境約需要3-6個月的時間，實際時間會因國籍、職種和政府審核速度而有所不同。我們會協助您加快流程，並隨時回報進度。", "category": "application", "question": "申請外籍勞工需要多久時間？"}, {"answer": "基本文件包括：公司登記證明、營業稅籍證明、工廠登記證（製造業）、勞保投保證明等。我們會提供完整的文件清單，並協助您準備所有必要文件。", "category": "application", "question": "需要準備哪些文件？"}, {"answer": "雇主需要負責外籍勞工的薪資、住宿、保險等基本權益，並遵守勞動法規。我們提供完整的法律諮詢服務，確保您的僱用關係符合所有法規要求。", "category": "legal", "question": "僱用外籍勞工有哪些法律責任？"}, {"answer": "外籍勞工的標準合約期限為3年，期滿後可以申請展延，最長可達12年（製造業14年）。我們會在合約到期前提醒您，並協助辦理展延手續。", "category": "contract", "question": "合約期限是多久？"}], "hero": {"title": "常見問題", "description": "找到您關心的問題解答，或直接聯繫我們的專業團隊"}, "categories": [{"id": "application", "name": "申請流程"}, {"id": "legal", "name": "法規相關"}, {"id": "contract", "name": "合約條款"}], "contactSection": {"title": "還有其他問題？", "buttonLink": "/contact", "buttonText": "聯絡我們", "description": "我們的專業團隊隨時為您解答"}}	2025-11-23 08:09:18.571	2025-11-23 08:09:18.571
9	staffPage	{"hero": {"image": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=600&fit=crop", "title": "主力人力", "description": "我們的專業業務團隊，竭誠為您提供最優質的人力仲介服務"}, "staffList": [{"id": "staff-001", "bio": "擁有10年以上人力仲介經驗，專精於製造業與營建業人才媒合。", "line": "@youshi_chen", "name": "陳大明", "email": "chen@youshi-hr.com", "phone": "0912-345-678", "photo": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop", "position": "業務經理", "specialties": ["製造業", "營建業", "大型企業專案"]}, {"id": "staff-002", "bio": "專注於家庭看護與養護機構人力配置，細心服務每一位客戶。", "line": "@youshi_lin", "name": "林小美", "email": "lin@youshi-hr.com", "phone": "0923-456-789", "photo": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop", "position": "資深業務專員", "specialties": ["家庭看護", "養護機構", "長照服務"]}, {"id": "staff-003", "bio": "熱情積極，致力於為中小企業提供最適合的人力解決方案。", "line": "@youshi_wang", "name": "王志豪", "email": "wang@youshi-hr.com", "phone": "0934-567-890", "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", "position": "業務專員", "specialties": ["中小企業", "服務業", "農漁業"]}], "ctaSection": {"title": "需要專人為您服務？", "buttonLink": "/contact", "buttonText": "立即聯絡", "description": "歡迎隨時聯繫我們的業務團隊，我們將竭誠為您提供專業諮詢"}}	2025-11-27 01:00:34.999	2025-11-27 01:00:34.999
10	franchisePage	{"cta": {"title": "想要了解佑羲人力加盟資訊", "buttons": [{"icon": "mail", "link": "/contact", "text": "聯絡我們", "variant": "primary"}, {"icon": "event_note", "link": "/franchise/seminar", "text": "加盟說明會報名表", "variant": "secondary"}], "subtitle": "歡迎與我們聯繫喔!", "contactInfo": [{"icon": "phone", "label": "免付費專線", "value": "0800-600-885"}, {"icon": "schedule", "label": "服務時間", "value": "週一至週五 09:00-18:00"}], "backgroundImage": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2000"}, "hero": {"title": "創業加盟", "backgroundImage": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=2000"}, "navButtons": [{"id": "market", "icon": "trending_up", "label": "市場趨勢"}, {"id": "details", "icon": "description", "label": "加盟詳情"}, {"id": "seminar", "icon": "event", "label": "報名加盟說明會"}, {"id": "testimonials", "icon": "forum", "label": "加盟主分享"}], "marketTrends": {"badge": "照護需求快速增長", "cards": [{"icon": "elderly", "title": "人口老化", "subtitle": "超高齡社會的挑戰與機遇", "chartIcon": "insert_chart", "chartLabel": "未來人口預估趨勢圖", "description": "目前,台灣已經步入超高齡社會,這意味著在每五個人當中,就有一位是65歲以上的長者。這種現象帶來的影響涉及到社會、經濟、醫療、長照等各個層面。"}, {"icon": "health_and_safety", "title": "不健康餘命", "subtitle": "平均8年的照護需求", "chartIcon": "monitoring", "chartLabel": "不健康餘命統計圖", "description": "根據政府公布的統計數據,透過計算「平均死亡年齡」減去「健康年齡」,我們可以得出所謂的「不健康餘命」。自2014年至2022年,台灣人平均會面臨約8年的不健康年齡。"}], "title": "加入佑羲人力,攜手共創照護新時代"}, "policySupport": {"title": "政策支持", "policies": [{"icon": "verified_user", "color": "from-blue-500 to-cyan-500", "title": "資格條件放寬", "description": "政府自113年年底即開始進行申請條件放寬的法規修訂,預計放寬後可以讓更多有需要的族群得到這方面的照護資源。"}, {"icon": "groups", "color": "from-cyan-500 to-teal-500", "title": "短期照護需求", "description": "政府將於114年試辦「多元陪伴照顧服務」,規劃由公益專業團體聘請移工,以一對多的方式,提供有照顧需求家庭臨時性照顧服務。"}], "subtitle": "政府積極推動長照產業發展"}, "franchiseProcess": {"steps": [{"icon": "contact_support", "title": "客戶洽詢", "number": 1}, {"icon": "psychology", "title": "需求了解", "number": 2}, {"icon": "map", "title": "鄰里評估現場勘查", "number": 3}, {"icon": "lightbulb", "title": "規劃建議", "number": 4}, {"icon": "handshake", "title": "專案簽約", "number": 5}, {"icon": "school", "title": "教育訓練", "number": 6}, {"icon": "construction", "title": "工程施作", "number": 7}, {"icon": "celebration", "title": "完工開幕", "number": 8}], "title": "加盟流程", "subtitle": "八個步驟,輕鬆開啟創業之路"}, "marketOpportunity": {"title": "長照市場:未來的黃金產業", "opportunities": [{"title": "無需經驗,全程培訓", "features": [{"icon": "support_agent", "label": "後端行政支持"}, {"icon": "campaign", "label": "品牌廣告行銷"}], "gradient": "from-blue-600 to-cyan-500", "subtitle": "素人就能上手"}, {"title": "突破長照2.0侷限性", "features": [{"icon": "trending_up", "label": "提供既有顧客更多服務"}, {"icon": "diversity_3", "label": "多角化經營不同層面顧客"}], "gradient": "from-cyan-500 to-teal-500", "subtitle": "長照相關工作的職涯升級"}], "backgroundImage": "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=2000"}, "partnershipAdvantages": {"title": "穩健創業的最佳夥伴—佑羲人力", "subtitle": "四大核心優勢,助您成功創業", "ctaButton": {"link": "#seminar", "text": "從零開始:成為加盟主"}, "advantages": [{"icon": "school", "title": "全程教育訓練", "number": "1", "subtitle": "分階段課程,從法規到實務,全方位指導", "description": "我們提供完整的教育訓練體系,課程依照加盟夥伴的需求分階段進行:基礎階段涵蓋相關法規與行業入門知識,中期則安排實務操作與案例分析,最終讓夥伴透過實地實習熟練各種技能。", "imagePosition": "right"}, {"icon": "verified", "title": "品質管控與支持", "number": "2", "subtitle": "品牌權利金模式,確保服務標準與業務品質", "description": "採取品牌權利金模式,我們嚴格管控服務流程與標準,確保每位加盟夥伴提供一致且高品質的服務。我們還提供定期稽核和改善建議,針對經營中的難題提供快速支援。", "imagePosition": "left"}, {"icon": "account_tree", "title": "多角化業務機會", "number": "3", "subtitle": "豐富經營經驗,拓展多元市場與客戶資源", "description": "作為業界領先品牌,佑羲人力累積了豐富的經驗與行業資源,協助加盟主開拓多元化市場機會。從家庭看護到機構合作,再到新興長照需求,每一個業務板塊都充滿潛力與機遇。", "imagePosition": "right"}, {"icon": "campaign", "title": "行銷與品牌背書", "number": "4", "subtitle": "獨立行銷團隊支援,提升市場競爭力", "description": "我們擁有專業的獨立行銷團隊,負責規劃品牌推廣活動,提供多樣化的宣傳資源,包括數位行銷、社群媒體推廣與實體活動策劃。我們還會針對地區特性量身定制行銷策略。", "imagePosition": "left"}]}}	2025-11-29 08:30:57.375	2025-11-29 08:30:57.375
\.


--
-- Data for Name: ManpowerRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ManpowerRequest" (id, "requestNo", "selectedResumeIds", "companyName", "contactPerson", "contactPhone", "contactEmail", "positionTitle", "jobDescription", quantity, "salaryRange", "expectedStartDate", "workLocation", "additionalRequirements", status, notes, "processedBy", "processedAt", "ipAddress", "userAgent", "createdAt", "updatedAt", "invitationCode", "invitedBy", "lineId", qualifications) FROM stdin;
1	MPR-20251124-48875	["3"]	無	eln tsai	026947347	26416387.re@gmail.com	\N	\N	1	\N	\N	\N	\N	pending	\N	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	2025-11-24 10:14:04.876	2025-11-24 10:14:04.876	\N	\N	\N	\N
2	MPR-20251124-58642	[{"id": "W002", "name": "Nguyen Van A ", "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", "title": "營建業", "skills": ["鋼筋綁紮", "模板施工", "工地安全"], "country": "越南", "location": "越南", "experience": "8年營建經驗"}]	\N	蔡翊廉	026947347	26416387.re@gmail.com	\N	\N	1	\N	\N	\N	\N	pending	\N	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	2025-11-24 14:21:53.472	2025-11-24 14:21:53.472	\N	\N	\N	\N
3	MPR-20251125-91379	[{"id": "W001", "name": "Maria Santos", "photo": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop", "title": "製造業", "skills": ["品質檢驗", "機械操作", "團隊合作"], "country": "菲律賓", "location": "菲律賓", "experience": "5年工廠經驗"}]	\N	蔡翊廉	026947347	26416387.re@gmail.com	\N	\N	1	\N	\N	\N	\N	pending	\N	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	2025-11-25 02:05:35.292	2025-11-25 02:05:35.292	\N	\N	\N	\N
\.


--
-- Data for Name: Navigation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Navigation" (id, label, url, "parentId", "order", "isActive", icon, target, "createdAt", "updatedAt") FROM stdin;
13	履歷表	/resume	\N	0	t	description	_self	2025-11-14 06:07:38.045	2025-11-25 02:15:36.63
12	申請流程	/apply-process	\N	1	t	approval	_self	2025-11-14 06:07:38.036	2025-11-25 02:15:36.63
14	常見問題	/faq	\N	2	t	help	_self	2025-11-14 06:07:38.046	2025-11-25 02:15:36.63
15	最新消息	/news	\N	3	t	newspaper	_self	2025-11-14 06:07:38.048	2025-11-25 02:15:36.63
16	創業計劃	/franchise	\N	4	t	rocket_launch	_self	2025-11-14 06:07:38.049	2025-11-25 02:15:36.63
22	主力人力	/staff	\N	5	t	\N	_self	2025-11-27 09:00:18.63	2025-11-27 09:00:18.63
\.


--
-- Data for Name: Page; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Page" (id, slug, title, description, template, content, "metaTags", status, "publishedAt", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
1	home	首頁	人力資源管理平台首頁	default	{"sections": [{"cta": {"link": "/about", "text": "了解更多"}, "type": "hero", "image": "/images/hero-banner.jpg", "title": "專業人力資源解決方案", "subtitle": "提供完整的人力派遣與管理服務"}, {"type": "features", "items": [{"icon": "shield", "title": "專業認證", "description": "政府合法立案，擁有完整證照"}, {"icon": "users", "title": "經驗豐富", "description": "超過20年人力派遣經驗"}, {"icon": "heart", "title": "用心服務", "description": "24小時客服支援系統"}, {"icon": "award", "title": "品質保證", "description": "嚴格篩選與訓練機制"}], "title": "我們的優勢"}]}	{"title": "人力資源管理平台 - 專業人力派遣服務", "keywords": "人力派遣,看護服務,居家照護,外籍看護", "description": "提供外籍看護、本國看護、居家照護等完整人力資源解決方案"}	published	2025-11-13 01:47:43.819	2025-11-13 01:47:43.82	2025-11-13 01:47:43.82	\N	\N
2	about	關於我們	關於人力資源管理平台	default	{"sections": [{"type": "content", "title": "公司簡介", "content": "我們是一家專業的人力資源管理公司，致力於提供優質的人力派遣服務..."}]}	\N	published	2025-11-13 01:47:43.819	2025-11-13 01:47:43.824	2025-11-13 01:47:43.824	\N	\N
\.


--
-- Data for Name: Signature; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Signature" (id, "contractId", "userId", "signedName", "signedAt", "ipAddress", signature, "otpCode", "otpVerified") FROM stdin;
\.


--
-- Data for Name: SystemConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SystemConfig" (id, key, value, category, "createdAt", "updatedAt") FROM stdin;
1	site_name	{"en": "Manpower HR System", "zh": "人力資源管理平台"}	general	2025-11-13 01:47:43.811	2025-11-13 01:47:43.811
2	contact_info	{"email": "info@manpower.com", "phone": "0800-123-456", "address": "台北市信義區信義路五段7號", "business_hours": "週一至週五 09:00-18:00"}	general	2025-11-13 01:47:43.817	2025-11-13 01:47:43.817
3	email_settings	{"from_name": "人力資源平台", "smtp_host": "smtp.gmail.com", "smtp_port": 587, "from_email": "noreply@manpower.com"}	email	2025-11-13 01:47:43.818	2025-11-13 01:47:43.818
4	ga4_settings	{"tracking_id": "G-XXXXXXXXXX", "enable_advertising": false, "enable_demographics": true}	analytics	2025-11-13 01:47:43.819	2025-11-13 01:47:43.819
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
439c35cd-5b12-485c-8fd4-e51f644ff91e	e3c04a3d4fed08e432e57a20f9bce84d63b46f9f170bac5fdfd141f5a5d747de	2025-11-13 09:46:34.889982+08	20251113014634_init	\N	\N	2025-11-13 09:46:34.864333+08	1
41b19908-743d-4145-8c73-56ad4ea59f30	c5217c82a6a0f051aa65cd254aa274a9a7183fae3355f00091896e3bd9f17803	2025-11-23 16:18:24.092857+08	20251123081824_add_manpower_request_model	\N	\N	2025-11-23 16:18:24.08054+08	1
a550d42e-5877-41f2-8fe4-a83fc7dca7f5	a20c7ee9fa4aa103ca9e257a629ce67d1d8193969b568a398c72e372c319ce08	2025-11-23 17:14:27.354848+08	20251123091402_fix_form_submission_foreign_key	\N	\N	2025-11-23 17:14:27.342609+08	1
33024acc-5fc7-4e3c-93c1-1ef804ecb4eb	bc3e1e6db825b85d57e550f6331742aa8a816d3100bd940939e9cd3bcb2feff0	2025-11-23 17:47:47.111849+08	20251123094740_optimize_database_indexes	\N	\N	2025-11-23 17:47:47.101732+08	1
ab3334c2-e5db-458a-b235-ba3060dd574c	16b1397787a32237babca9d78326780b1030e9b311fa7e8dee0a17e9cd4756b4	2025-11-24 18:09:44.227455+08	20251124100944_make_position_title_optional	\N	\N	2025-11-24 18:09:44.22164+08	1
\.


--
-- Data for Name: ip_blocklist; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ip_blocklist (id, "ipAddress", reason, attempts, "blockedAt", "expiresAt", "createdAt", "updatedAt") FROM stdin;
1	dev-smaqbd-5089	\N	1	\N	\N	2025-11-14 10:49:55.089	2025-11-14 10:49:55.089
2	dev-smaqbd-7572	\N	1	\N	\N	2025-11-14 10:49:57.573	2025-11-14 10:49:57.573
3	dev-smaqbd-2853	\N	1	\N	\N	2025-11-14 10:50:02.853	2025-11-14 10:50:02.853
4	dev-smaqbd-7105	\N	1	\N	\N	2025-11-14 10:50:47.106	2025-11-14 10:50:47.106
5	dev-smaqbd-5047	\N	1	\N	\N	2025-11-14 11:34:45.048	2025-11-14 11:34:45.048
6	dev-smaqbd-2068	\N	1	\N	\N	2025-11-14 11:34:52.069	2025-11-14 11:34:52.069
7	dev-smaqbd-7518	\N	1	\N	\N	2025-11-14 11:34:57.52	2025-11-14 11:34:57.52
8	dev-smaqbd-7214	\N	1	\N	\N	2025-11-14 11:35:07.216	2025-11-14 11:35:07.216
9	dev-smaqbd-6933	\N	1	\N	\N	2025-11-14 11:35:46.934	2025-11-14 11:35:46.934
\.


--
-- Name: ActivityLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ActivityLog_id_seq"', 28, true);


--
-- Name: Analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Analytics_id_seq"', 1, false);


--
-- Name: Attachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Attachment_id_seq"', 1, false);


--
-- Name: ContentBlock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ContentBlock_id_seq"', 10, true);


--
-- Name: ContractTemplate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ContractTemplate_id_seq"', 3, true);


--
-- Name: Contract_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Contract_id_seq"', 1, false);


--
-- Name: FormSubmission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."FormSubmission_id_seq"', 1, false);


--
-- Name: FormTemplate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."FormTemplate_id_seq"', 4, true);


--
-- Name: ManpowerRequest_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ManpowerRequest_id_seq"', 3, true);


--
-- Name: Navigation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Navigation_id_seq"', 22, true);


--
-- Name: Page_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Page_id_seq"', 2, true);


--
-- Name: Signature_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Signature_id_seq"', 1, false);


--
-- Name: SystemConfig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."SystemConfig_id_seq"', 4, true);


--
-- Name: ip_blocklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ip_blocklist_id_seq', 9, true);


--
-- PostgreSQL database dump complete
--

