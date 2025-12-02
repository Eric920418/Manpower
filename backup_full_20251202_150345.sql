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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AdminTaskStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AdminTaskStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'PENDING_DOCUMENTS'
);


--
-- Name: ApprovalRoute; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApprovalRoute" AS ENUM (
    'V_ROUTE',
    'DASH_ROUTE'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'SUPER_ADMIN',
    'OWNER',
    'STAFF',
    'ADMIN'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ActivityLog" (
    id integer NOT NULL,
    "userId" text NOT NULL,
    action text NOT NULL,
    entity text NOT NULL,
    "entityId" text,
    details jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ActivityLog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ActivityLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ActivityLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ActivityLog_id_seq" OWNED BY public."ActivityLog".id;


--
-- Name: AdminTask; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AdminTask" (
    id integer NOT NULL,
    "taskNo" text NOT NULL,
    title text NOT NULL,
    "applicantId" text NOT NULL,
    "processorId" text,
    "approverId" text,
    "applicationDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deadline timestamp(3) without time zone,
    "receivedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    status public."AdminTaskStatus" DEFAULT 'PENDING'::public."AdminTaskStatus" NOT NULL,
    "approvalRoute" public."ApprovalRoute" DEFAULT 'V_ROUTE'::public."ApprovalRoute" NOT NULL,
    "approvalMark" text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "applicantName" text,
    "processorName" text,
    "taskTypeId" integer NOT NULL,
    "groupId" text,
    "parentTaskId" integer
);


--
-- Name: AdminTaskAttachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AdminTaskAttachment" (
    id integer NOT NULL,
    "taskId" integer NOT NULL,
    filename text NOT NULL,
    "originalName" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    path text NOT NULL,
    url text,
    "uploadedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AdminTaskAttachment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AdminTaskAttachment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AdminTaskAttachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AdminTaskAttachment_id_seq" OWNED BY public."AdminTaskAttachment".id;


--
-- Name: AdminTaskTypeAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AdminTaskTypeAssignment" (
    id integer NOT NULL,
    "adminId" text NOT NULL,
    "taskTypeId" integer NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "assignedBy" text
);


--
-- Name: AdminTaskTypeAssignment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AdminTaskTypeAssignment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AdminTaskTypeAssignment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AdminTaskTypeAssignment_id_seq" OWNED BY public."AdminTaskTypeAssignment".id;


--
-- Name: AdminTask_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AdminTask_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AdminTask_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AdminTask_id_seq" OWNED BY public."AdminTask".id;


--
-- Name: Analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Analytics" (
    id integer NOT NULL,
    event text NOT NULL,
    category text NOT NULL,
    action text,
    label text,
    value double precision,
    "userId" text,
    "sessionId" text,
    "ipAddress" text,
    "userAgent" text,
    referrer text,
    data jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Analytics_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Analytics_id_seq" OWNED BY public."Analytics".id;


--
-- Name: ApprovalRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApprovalRecord" (
    id integer NOT NULL,
    "taskId" integer NOT NULL,
    action text NOT NULL,
    comment text,
    "approverId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ApprovalRecord_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ApprovalRecord_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ApprovalRecord_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ApprovalRecord_id_seq" OWNED BY public."ApprovalRecord".id;


--
-- Name: ContentBlock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContentBlock" (
    id integer NOT NULL,
    key text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ContentBlock_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ContentBlock_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ContentBlock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ContentBlock_id_seq" OWNED BY public."ContentBlock".id;


--
-- Name: ManpowerRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ManpowerRequest" (
    id integer NOT NULL,
    "requestNo" text NOT NULL,
    "selectedResumeIds" jsonb NOT NULL,
    "companyName" text,
    "contactPerson" text NOT NULL,
    "contactPhone" text NOT NULL,
    "contactEmail" text,
    "positionTitle" text,
    "jobDescription" text,
    quantity integer DEFAULT 1 NOT NULL,
    "salaryRange" text,
    "expectedStartDate" timestamp(3) without time zone,
    "workLocation" text,
    "additionalRequirements" text,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    "processedBy" text,
    "processedAt" timestamp(3) without time zone,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "invitationCode" text,
    "invitedBy" text,
    "lineId" text,
    qualifications jsonb
);


--
-- Name: ManpowerRequest_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ManpowerRequest_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ManpowerRequest_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ManpowerRequest_id_seq" OWNED BY public."ManpowerRequest".id;


--
-- Name: Navigation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Navigation" (
    id integer NOT NULL,
    label text NOT NULL,
    url text,
    "parentId" integer,
    "order" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    icon text,
    target text DEFAULT '_self'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Navigation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Navigation_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Navigation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Navigation_id_seq" OWNED BY public."Navigation".id;


--
-- Name: Page; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Page" (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text,
    template text DEFAULT 'default'::text NOT NULL,
    content jsonb DEFAULT '[]'::jsonb NOT NULL,
    "metaTags" jsonb,
    status text DEFAULT 'draft'::text NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text
);


--
-- Name: Page_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Page_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Page_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Page_id_seq" OWNED BY public."Page".id;


--
-- Name: SystemConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SystemConfig" (
    id integer NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SystemConfig_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."SystemConfig_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SystemConfig_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."SystemConfig_id_seq" OWNED BY public."SystemConfig".id;


--
-- Name: TaskType; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TaskType" (
    id integer NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    "order" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    "positionX" double precision,
    "positionY" double precision
);


--
-- Name: TaskTypeFlow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TaskTypeFlow" (
    id integer NOT NULL,
    "fromTaskTypeId" integer NOT NULL,
    "toTaskTypeId" integer NOT NULL,
    label text,
    condition jsonb,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TaskTypeFlow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TaskTypeFlow_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TaskTypeFlow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TaskTypeFlow_id_seq" OWNED BY public."TaskTypeFlow".id;


--
-- Name: TaskType_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TaskType_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TaskType_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TaskType_id_seq" OWNED BY public."TaskType".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    password text,
    role public."Role" DEFAULT 'STAFF'::public."Role" NOT NULL,
    department text,
    phone text,
    avatar text,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "invitationCode" text,
    "invitationCount" integer DEFAULT 0 NOT NULL,
    bio text,
    "isPublic" boolean DEFAULT true NOT NULL,
    "lineId" text,
    "position" text,
    specialties jsonb,
    "customPermissions" jsonb
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: ActivityLog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog" ALTER COLUMN id SET DEFAULT nextval('public."ActivityLog_id_seq"'::regclass);


--
-- Name: AdminTask id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTask" ALTER COLUMN id SET DEFAULT nextval('public."AdminTask_id_seq"'::regclass);


--
-- Name: AdminTaskAttachment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTaskAttachment" ALTER COLUMN id SET DEFAULT nextval('public."AdminTaskAttachment_id_seq"'::regclass);


--
-- Name: AdminTaskTypeAssignment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTaskTypeAssignment" ALTER COLUMN id SET DEFAULT nextval('public."AdminTaskTypeAssignment_id_seq"'::regclass);


--
-- Name: Analytics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Analytics" ALTER COLUMN id SET DEFAULT nextval('public."Analytics_id_seq"'::regclass);


--
-- Name: ApprovalRecord id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalRecord" ALTER COLUMN id SET DEFAULT nextval('public."ApprovalRecord_id_seq"'::regclass);


--
-- Name: ContentBlock id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentBlock" ALTER COLUMN id SET DEFAULT nextval('public."ContentBlock_id_seq"'::regclass);


--
-- Name: ManpowerRequest id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManpowerRequest" ALTER COLUMN id SET DEFAULT nextval('public."ManpowerRequest_id_seq"'::regclass);


--
-- Name: Navigation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Navigation" ALTER COLUMN id SET DEFAULT nextval('public."Navigation_id_seq"'::regclass);


--
-- Name: Page id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Page" ALTER COLUMN id SET DEFAULT nextval('public."Page_id_seq"'::regclass);


--
-- Name: SystemConfig id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemConfig" ALTER COLUMN id SET DEFAULT nextval('public."SystemConfig_id_seq"'::regclass);


--
-- Name: TaskType id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskType" ALTER COLUMN id SET DEFAULT nextval('public."TaskType_id_seq"'::regclass);


--
-- Name: TaskTypeFlow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTypeFlow" ALTER COLUMN id SET DEFAULT nextval('public."TaskTypeFlow_id_seq"'::regclass);


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
29	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-11-30 15:43:49.402
30	cmhwrrknb00008g3mhh2zbiow	create	admin_task	1	{"title": "測試", "taskNo": "AT-20251201-0001", "taskTypeId": 1}	\N	\N	2025-12-01 08:07:43.766
31	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-12-01 12:26:23.161
32	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-12-01 12:33:39.322
33	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-12-01 12:39:57.088
34	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-12-01 12:44:31.596
35	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-12-01 13:01:37.055
36	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-12-01 13:05:50.208
37	cmhwrrknb00008g3mhh2zbiow	login	user	cmhwrrknb00008g3mhh2zbiow	{"role": "SUPER_ADMIN", "email": "admin@youshi-hr.com"}	\N	\N	2025-12-02 01:41:24.214
38	cmhwrrknb00008g3mhh2zbiow	update	task_type	1	{"code": "CREATE_FILE", "label": "建檔1", "changes": {"code": "CREATE_FILE", "label": "建檔1", "questionsUpdated": true}}	\N	\N	2025-12-02 01:42:21.992
39	cmhwrrknb00008g3mhh2zbiow	update	page	staffPage	{"pageName": "業務人員頁", "changedFields": ["hero", "staffList", "ctaSection"]}	\N	\N	2025-12-02 01:43:11.091
40	cmhwrrknb00008g3mhh2zbiow	update	page	workersPage	{"pageName": "移工列表頁", "changedFields": ["hero", "filterOptions", "workers", "ctaSection"]}	\N	\N	2025-12-02 01:43:27.448
41	cmhwrrknb00008g3mhh2zbiow	update	manpower_request	3	{"changes": {"notes": null, "status": "completed", "processedAt": "2025-12-02T01:43:58.576Z", "processedBy": "cmhwrrknb00008g3mhh2zbiow"}, "requestNo": "MPR-20251125-91379"}	\N	\N	2025-12-02 01:43:58.588
\.


--
-- Data for Name: AdminTask; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AdminTask" (id, "taskNo", title, "applicantId", "processorId", "approverId", "applicationDate", deadline, "receivedAt", "completedAt", status, "approvalRoute", "approvalMark", payload, notes, "createdAt", "updatedAt", "applicantName", "processorName", "taskTypeId", "groupId", "parentTaskId") FROM stdin;
1	AT-20251201-0001	測試	cmhwrrknb00008g3mhh2zbiow	\N	\N	2025-12-01 08:07:43.742	2026-01-08 08:06:00	\N	\N	PENDING	V_ROUTE	\N	{}	測試	2025-12-01 08:07:43.742	2025-12-01 08:07:43.742	eric	\N	1	\N	\N
\.


--
-- Data for Name: AdminTaskAttachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AdminTaskAttachment" (id, "taskId", filename, "originalName", "mimeType", size, path, url, "uploadedBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: AdminTaskTypeAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AdminTaskTypeAssignment" (id, "adminId", "taskTypeId", "assignedAt", "assignedBy") FROM stdin;
\.


--
-- Data for Name: Analytics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Analytics" (id, event, category, action, label, value, "userId", "sessionId", "ipAddress", "userAgent", referrer, data, "createdAt") FROM stdin;
\.


--
-- Data for Name: ApprovalRecord; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApprovalRecord" (id, "taskId", action, comment, "approverId", "createdAt") FROM stdin;
\.


--
-- Data for Name: ContentBlock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ContentBlock" (id, key, payload, "createdAt", "updatedAt") FROM stdin;
2	logo	{"main": "", "footer": "", "favicon": ""}	2025-11-14 11:06:40.077	2025-11-14 11:06:40.077
1	homePage	{"hero": {"badge": "專業外籍勞工仲介", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuD-q5MC8lSOtjm5jds_NVEfwmrmueqgr9iiW4ck6RHwOTdoV-HPSXi25zLjSZMo4knk3WpkwD0vKirIeyCRXAjWSqhBXUEk8vc97jkGLY-P9pJZsWaorzrGp93KHmPfYe6Vg-mpOfgj3cIXUfiImRKHKzi5FzUQXM6jicXDJonBG6NDFm5Z_iw_iE_sJvPVLflrW-M21w5PqLlZ9UEsHsfUgZa_-814pGT1K0tOYI3ONYmWfeUxWLNxgp8hYucFdVJVxL430EKvwnM", "title": "連接全球人才，驅動您的業務增長", "primaryCTA": {"link": "#", "text": "尋找員工"}, "description": "我們專注於為您的企業引進可靠、技術嫻熟的國際勞工，提供從招聘到安頓的全方位支持，確保無縫對接。", "secondaryCTA": {"link": "#", "text": "我要找工作"}}, "header": {"logo": {"icon": "groups", "text": "全球人才橋樑"}, "navigation": [{"link": "#", "label": "雇主服務"}, {"link": "#", "label": "尋找工作"}, {"link": "#", "label": "關於我們"}, {"link": "#", "label": "資源中心"}], "contactButton": {"link": "#", "text": "聯絡我們"}}}	2025-11-13 03:45:02.864	2025-11-14 11:47:01.54
4	newsPage	{"hero": {"title": "最新消息", "description": "掌握最新的產業動態、政策更新和成功案例分享"}, "newsList": [{"date": "2024-01-10", "link": "/news/manufacturing-labor-shortage", "image": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop", "title": "製造業缺工問題持續，外籍勞工需求創新高", "excerpt": "根據最新統計，製造業缺工人數突破10萬人，外籍勞工引進成為企業解決人力短缺的重要途徑。", "category": "產業新聞"}, {"date": "2024-01-05", "link": "/news/multicultural-workplace", "image": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop", "title": "成功案例分享：如何建立友善的多元文化職場", "excerpt": "訪問三家成功引進外籍勞工的企業，分享他們如何打造包容性的工作環境。", "category": "成功案例"}], "categories": ["全部", "政策公告", "產業新聞", "成功案例", "活動訊息"], "featuredNews": {"date": "2024-01-15", "link": "/news/2024-new-regulations", "image": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=500&fit=crop", "title": "2024年外籍勞工新制上路", "excerpt": "勞動部宣布新的外籍勞工管理辦法，簡化申請流程並提高配額上限。了解新制如何影響您的企業。", "category": "政策公告"}}	2025-11-23 08:09:20.484	2025-11-24 11:48:29.738
5	applicationProcessPage	{"hero": {"image": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=600&fit=crop", "title": "申請流程", "description": "簡單四步驟，讓我們協助您找到最合適的人才"}, "steps": [{"icon": "description", "title": "提出需求", "number": 1, "description": "填寫您的人力需求表單，告訴我們您需要的人才類型"}, {"icon": "people_alt", "title": "人才配對", "number": 2, "description": "我們根據您的需求，從資料庫中篩選最適合的候選人"}, {"icon": "videocam", "title": "面試安排", "number": 3, "description": "安排視訊或現場面試，讓您親自與候選人溝通"}, {"icon": "handshake", "title": "簽約入職", "number": 4, "description": "確認人選後，我們協助辦理所有法律文件與入職手續"}], "categories": [{"id": "caregiver", "icon": "elderly", "name": "看護工", "color": "from-blue-500 to-cyan-500", "steps": [{"icon": "fact_check", "title": "資格審查", "number": 1, "description": "確認申請者符合看護工基本資格，包括年齡、健康狀況、無犯罪紀錄等"}, {"icon": "verified", "title": "證照驗證", "number": 2, "description": "審核相關照護證照、醫療訓練證明，確保專業能力"}, {"icon": "psychology", "title": "專業面試", "number": 3, "description": "由專業照護主管進行面試，評估照護技能與溝通能力"}, {"icon": "school", "title": "職前訓練", "number": 4, "description": "提供專業照護技能培訓，包括基本醫療知識、照護技巧等"}, {"icon": "handshake", "title": "簽約媒合", "number": 5, "description": "完成訓練後，媒合適合的照護對象並簽署勞動契約"}], "description": "專業照護服務人員申請流程"}, {"id": "domestic-helper", "icon": "home_work", "name": "幫傭", "color": "from-purple-500 to-pink-500", "steps": [{"icon": "badge", "title": "基本資料審核", "number": 1, "description": "確認申請者年滿18歲、健康證明、良民證等基本文件"}, {"icon": "star", "title": "經驗評估", "number": 2, "description": "了解過往家務工作經驗、專長技能（烹飪、清潔、育兒等）"}, {"icon": "task_alt", "title": "面試與技能測試", "number": 3, "description": "實地面試並進行簡單的家務技能測試"}, {"icon": "connect_without_contact", "title": "僱主媒合", "number": 4, "description": "根據技能與需求，媒合適合的僱主家庭"}, {"icon": "edit_document", "title": "簽約上工", "number": 5, "description": "與僱主簽訂僱傭契約，確認工作內容、薪資與工時"}], "description": "家務管理專家申請流程"}, {"id": "factory-worker", "icon": "precision_manufacturing", "name": "廠工", "color": "from-orange-500 to-red-500", "steps": [{"icon": "description", "title": "需求登記", "number": 1, "description": "填寫個人基本資料、工作經驗、期望薪資與工作地點"}, {"icon": "health_and_safety", "title": "體能與健康檢查", "number": 2, "description": "進行基本體能測試與健康檢查，確保可勝任工廠作業"}, {"icon": "engineering", "title": "技能評估", "number": 3, "description": "評估生產線操作、品質檢驗、設備使用等相關技能"}, {"icon": "factory", "title": "工廠媒合", "number": 4, "description": "根據技能與地點偏好，媒合合適的製造業工廠"}, {"icon": "work", "title": "入職報到", "number": 5, "description": "完成勞動契約簽署、安全教育訓練，正式入職"}], "description": "製造業人才申請流程"}, {"id": "construction-worker", "icon": "construction", "name": "營造工", "color": "from-yellow-600 to-orange-600", "steps": [{"icon": "workspace_premium", "title": "證照資格審查", "number": 1, "description": "確認相關營造證照（如職業安全衛生教育訓練證明）"}, {"icon": "build", "title": "專業技能驗證", "number": 2, "description": "評估土木、建築、水電等專業技術能力"}, {"icon": "security", "title": "安全訓練", "number": 3, "description": "進行工地安全教育訓練，確保工作安全意識"}, {"icon": "apartment", "title": "工程媒合", "number": 4, "description": "根據專長媒合建築工程專案（如鋼筋、模板、土木等）"}, {"icon": "how_to_reg", "title": "簽約進場", "number": 5, "description": "簽署工程承攬契約，辦理工地進場手續"}], "description": "建築專業人員申請流程"}, {"id": "nursing-home", "icon": "local_hospital", "name": "養護機構", "color": "from-green-500 to-emerald-500", "steps": [{"icon": "medical_information", "title": "專業證照審核", "number": 1, "description": "確認照護相關證照（如照顧服務員證照、護理師執照等）"}, {"icon": "history_edu", "title": "照護經驗評估", "number": 2, "description": "評估在長照機構、安養中心、護理之家的工作經驗"}, {"icon": "groups", "title": "專業面試", "number": 3, "description": "由機構主管進行面試，評估照護能力與團隊合作精神"}, {"icon": "menu_book", "title": "機構訓練", "number": 4, "description": "接受機構內部訓練，熟悉工作流程與照護標準"}, {"icon": "approval", "title": "正式聘僱", "number": 5, "description": "簽署勞動契約，成為養護機構正式員工"}], "description": "專業照護團隊申請流程"}], "contactCTA": {"title": "準備開始了嗎？？", "buttonLink": "/contact", "buttonText": "聯絡我們", "description": "立即聯繫我們，讓專業團隊為您服務"}}	2025-11-24 10:16:54.302	2025-11-25 02:12:59.754
7	workersPage	{"hero": {"image": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&h=600&fit=crop", "title": "優質人才庫1", "description": "瀏覽我們精選的專業人才，選擇最適合您企業的員工"}, "workers": [{"id": "W001", "age": 28, "name": "Maria Santos", "photo": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop", "gender": "女", "skills": ["品質檢驗", "機械操作", "團隊合作"], "country": "菲律賓", "category": "製造業", "languages": ["中文", "英文", "他加祿語"], "experience": "5年工廠經驗", "description": "具備豐富的工廠生產線經驗，熟悉品質管理流程。", "availability": "即時可上工"}, {"id": "W002", "age": 32, "name": "Nguyen Van A ", "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", "gender": "男", "skills": ["鋼筋綁紮", "模板施工", "工地安全"], "country": "越南", "category": "營建業", "languages": ["中文", "越南語"], "experience": "8年營建經驗", "description": "擁有多項營建證照，工作態度認真負責。", "availability": "一個月內"}], "ctaSection": {"title": "沒有找到合適的人選？", "buttonLink": "/contact", "buttonText": "聯絡專員", "description": "告訴我們您的特殊需求，我們將為您客製化搜尋人才"}, "filterOptions": {"genders": ["男", "女", "不限"], "countries": ["菲律賓", "越南", "印尼", "泰國"], "categories": ["製造業", "營建業", "服務業", "農業", "漁業"]}}	2025-11-24 10:17:17.084	2025-12-02 01:43:27.445
3	faqPage	{"faqs": [{"answer": "一般來說，從提出申請到人員入境約需要3-6個月的時間，實際時間會因國籍、職種和政府審核速度而有所不同。我們會協助您加快流程，並隨時回報進度。", "category": "application", "question": "申請外籍勞工需要多久時間？"}, {"answer": "基本文件包括：公司登記證明、營業稅籍證明、工廠登記證（製造業）、勞保投保證明等。我們會提供完整的文件清單，並協助您準備所有必要文件。", "category": "application", "question": "需要準備哪些文件？"}, {"answer": "雇主需要負責外籍勞工的薪資、住宿、保險等基本權益，並遵守勞動法規。我們提供完整的法律諮詢服務，確保您的僱用關係符合所有法規要求。", "category": "legal", "question": "僱用外籍勞工有哪些法律責任？"}, {"answer": "外籍勞工的標準合約期限為3年，期滿後可以申請展延，最長可達12年（製造業14年）。我們會在合約到期前提醒您，並協助辦理展延手續。", "category": "contract", "question": "合約期限是多久？"}], "hero": {"title": "常見問題", "description": "找到您關心的問題解答，或直接聯繫我們的專業團隊"}, "categories": [{"id": "application", "name": "申請流程"}, {"id": "legal", "name": "法規相關"}, {"id": "contract", "name": "合約條款"}], "contactSection": {"title": "還有其他問題？", "buttonLink": "/contact", "buttonText": "聯絡我們", "description": "我們的專業團隊隨時為您解答"}}	2025-11-23 08:09:18.571	2025-11-23 08:09:18.571
10	franchisePage	{"cta": {"title": "想要了解佑羲人力加盟資訊", "buttons": [{"icon": "mail", "link": "/contact", "text": "聯絡我們", "variant": "primary"}, {"icon": "event_note", "link": "/franchise/seminar", "text": "加盟說明會報名表", "variant": "secondary"}], "subtitle": "歡迎與我們聯繫喔!", "contactInfo": [{"icon": "phone", "label": "免付費專線", "value": "0800-600-885"}, {"icon": "schedule", "label": "服務時間", "value": "週一至週五 09:00-18:00"}], "backgroundImage": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2000"}, "hero": {"title": "創業加盟", "backgroundImage": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=2000"}, "navButtons": [{"id": "market", "icon": "trending_up", "label": "市場趨勢"}, {"id": "details", "icon": "description", "label": "加盟詳情"}, {"id": "seminar", "icon": "event", "label": "報名加盟說明會"}, {"id": "testimonials", "icon": "forum", "label": "加盟主分享"}], "marketTrends": {"badge": "照護需求快速增長", "cards": [{"icon": "elderly", "title": "人口老化", "subtitle": "超高齡社會的挑戰與機遇", "chartIcon": "insert_chart", "chartLabel": "未來人口預估趨勢圖", "description": "目前,台灣已經步入超高齡社會,這意味著在每五個人當中,就有一位是65歲以上的長者。這種現象帶來的影響涉及到社會、經濟、醫療、長照等各個層面。"}, {"icon": "health_and_safety", "title": "不健康餘命", "subtitle": "平均8年的照護需求", "chartIcon": "monitoring", "chartLabel": "不健康餘命統計圖", "description": "根據政府公布的統計數據,透過計算「平均死亡年齡」減去「健康年齡」,我們可以得出所謂的「不健康餘命」。自2014年至2022年,台灣人平均會面臨約8年的不健康年齡。"}], "title": "加入佑羲人力,攜手共創照護新時代"}, "policySupport": {"title": "政策支持", "policies": [{"icon": "verified_user", "color": "from-blue-500 to-cyan-500", "title": "資格條件放寬", "description": "政府自113年年底即開始進行申請條件放寬的法規修訂,預計放寬後可以讓更多有需要的族群得到這方面的照護資源。"}, {"icon": "groups", "color": "from-cyan-500 to-teal-500", "title": "短期照護需求", "description": "政府將於114年試辦「多元陪伴照顧服務」,規劃由公益專業團體聘請移工,以一對多的方式,提供有照顧需求家庭臨時性照顧服務。"}], "subtitle": "政府積極推動長照產業發展"}, "franchiseProcess": {"steps": [{"icon": "contact_support", "title": "客戶洽詢", "number": 1}, {"icon": "psychology", "title": "需求了解", "number": 2}, {"icon": "map", "title": "鄰里評估現場勘查", "number": 3}, {"icon": "lightbulb", "title": "規劃建議", "number": 4}, {"icon": "handshake", "title": "專案簽約", "number": 5}, {"icon": "school", "title": "教育訓練", "number": 6}, {"icon": "construction", "title": "工程施作", "number": 7}, {"icon": "celebration", "title": "完工開幕", "number": 8}], "title": "加盟流程", "subtitle": "八個步驟,輕鬆開啟創業之路"}, "marketOpportunity": {"title": "長照市場:未來的黃金產業", "opportunities": [{"title": "無需經驗,全程培訓", "features": [{"icon": "support_agent", "label": "後端行政支持"}, {"icon": "campaign", "label": "品牌廣告行銷"}], "gradient": "from-blue-600 to-cyan-500", "subtitle": "素人就能上手"}, {"title": "突破長照2.0侷限性", "features": [{"icon": "trending_up", "label": "提供既有顧客更多服務"}, {"icon": "diversity_3", "label": "多角化經營不同層面顧客"}], "gradient": "from-cyan-500 to-teal-500", "subtitle": "長照相關工作的職涯升級"}], "backgroundImage": "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=2000"}, "partnershipAdvantages": {"title": "穩健創業的最佳夥伴—佑羲人力", "subtitle": "四大核心優勢,助您成功創業", "ctaButton": {"link": "#seminar", "text": "從零開始:成為加盟主"}, "advantages": [{"icon": "school", "title": "全程教育訓練", "number": "1", "subtitle": "分階段課程,從法規到實務,全方位指導", "description": "我們提供完整的教育訓練體系,課程依照加盟夥伴的需求分階段進行:基礎階段涵蓋相關法規與行業入門知識,中期則安排實務操作與案例分析,最終讓夥伴透過實地實習熟練各種技能。", "imagePosition": "right"}, {"icon": "verified", "title": "品質管控與支持", "number": "2", "subtitle": "品牌權利金模式,確保服務標準與業務品質", "description": "採取品牌權利金模式,我們嚴格管控服務流程與標準,確保每位加盟夥伴提供一致且高品質的服務。我們還提供定期稽核和改善建議,針對經營中的難題提供快速支援。", "imagePosition": "left"}, {"icon": "account_tree", "title": "多角化業務機會", "number": "3", "subtitle": "豐富經營經驗,拓展多元市場與客戶資源", "description": "作為業界領先品牌,佑羲人力累積了豐富的經驗與行業資源,協助加盟主開拓多元化市場機會。從家庭看護到機構合作,再到新興長照需求,每一個業務板塊都充滿潛力與機遇。", "imagePosition": "right"}, {"icon": "campaign", "title": "行銷與品牌背書", "number": "4", "subtitle": "獨立行銷團隊支援,提升市場競爭力", "description": "我們擁有專業的獨立行銷團隊,負責規劃品牌推廣活動,提供多樣化的宣傳資源,包括數位行銷、社群媒體推廣與實體活動策劃。我們還會針對地區特性量身定制行銷策略。", "imagePosition": "left"}]}}	2025-11-29 08:30:57.375	2025-11-29 08:30:57.375
9	staffPage	{"hero": {"image": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=600&fit=crop", "title": "主力人力1", "description": "我們的專業業務團隊，竭誠為您提供最優質的人力仲介服務"}, "staffList": [{"id": "staff-001", "bio": "擁有10年以上人力仲介經驗，專精於製造業與營建業人才媒合。", "line": "@youshi_chen", "name": "陳大明", "email": "chen@youshi-hr.com", "phone": "0912-345-678", "photo": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop", "position": "業務經理", "specialties": ["製造業", "營建業", "大型企業專案"]}, {"id": "staff-002", "bio": "專注於家庭看護與養護機構人力配置，細心服務每一位客戶。", "line": "@youshi_lin", "name": "林小美", "email": "lin@youshi-hr.com", "phone": "0923-456-789", "photo": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop", "position": "資深業務專員", "specialties": ["家庭看護", "養護機構", "長照服務"]}, {"id": "staff-003", "bio": "熱情積極，致力於為中小企業提供最適合的人力解決方案。", "line": "@youshi_wang", "name": "王志豪", "email": "wang@youshi-hr.com", "phone": "0934-567-890", "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", "position": "業務專員", "specialties": ["中小企業", "服務業", "農漁業"]}], "ctaSection": {"title": "需要專人為您服務？", "buttonLink": "/contact", "buttonText": "立即聯絡", "description": "歡迎隨時聯繫我們的業務團隊，我們將竭誠為您提供專業諮詢"}}	2025-11-27 01:00:34.999	2025-12-02 01:43:11.081
\.


--
-- Data for Name: ManpowerRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ManpowerRequest" (id, "requestNo", "selectedResumeIds", "companyName", "contactPerson", "contactPhone", "contactEmail", "positionTitle", "jobDescription", quantity, "salaryRange", "expectedStartDate", "workLocation", "additionalRequirements", status, notes, "processedBy", "processedAt", "ipAddress", "userAgent", "createdAt", "updatedAt", "invitationCode", "invitedBy", "lineId", qualifications) FROM stdin;
1	MPR-20251124-48875	["3"]	無	eln tsai	026947347	26416387.re@gmail.com	\N	\N	1	\N	\N	\N	\N	pending	\N	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	2025-11-24 10:14:04.876	2025-11-24 10:14:04.876	\N	\N	\N	\N
2	MPR-20251124-58642	[{"id": "W002", "name": "Nguyen Van A ", "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", "title": "營建業", "skills": ["鋼筋綁紮", "模板施工", "工地安全"], "country": "越南", "location": "越南", "experience": "8年營建經驗"}]	\N	蔡翊廉	026947347	26416387.re@gmail.com	\N	\N	1	\N	\N	\N	\N	pending	\N	\N	\N	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	2025-11-24 14:21:53.472	2025-11-24 14:21:53.472	\N	\N	\N	\N
3	MPR-20251125-91379	[{"id": "W001", "name": "Maria Santos", "photo": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop", "title": "製造業", "skills": ["品質檢驗", "機械操作", "團隊合作"], "country": "菲律賓", "location": "菲律賓", "experience": "5年工廠經驗"}]	\N	蔡翊廉	026947347	26416387.re@gmail.com	\N	\N	1	\N	\N	\N	\N	completed	\N	cmhwrrknb00008g3mhh2zbiow	2025-12-02 01:43:58.576	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	2025-11-25 02:05:35.292	2025-12-02 01:43:58.577	\N	\N	\N	\N
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
-- Data for Name: SystemConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SystemConfig" (id, key, value, category, "createdAt", "updatedAt") FROM stdin;
1	site_name	{"en": "Manpower HR System", "zh": "人力資源管理平台"}	general	2025-11-13 01:47:43.811	2025-11-13 01:47:43.811
2	contact_info	{"email": "info@manpower.com", "phone": "0800-123-456", "address": "台北市信義區信義路五段7號", "business_hours": "週一至週五 09:00-18:00"}	general	2025-11-13 01:47:43.817	2025-11-13 01:47:43.817
3	email_settings	{"from_name": "人力資源平台", "smtp_host": "smtp.gmail.com", "smtp_port": 587, "from_email": "noreply@manpower.com"}	email	2025-11-13 01:47:43.818	2025-11-13 01:47:43.818
4	ga4_settings	{"tracking_id": "G-XXXXXXXXXX", "enable_advertising": false, "enable_demographics": true}	analytics	2025-11-13 01:47:43.819	2025-11-13 01:47:43.819
\.


--
-- Data for Name: TaskType; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TaskType" (id, code, label, description, "order", "isActive", "createdAt", "updatedAt", questions, "positionX", "positionY") FROM stdin;
2	TERMINATION	廢聘	解除聘僱關係	1	t	2025-11-30 15:36:26.311	2025-12-01 15:13:51.048	[]	349.447413615059	60.18034986192392
3	LONG_TERM_CARE	長照求才	長期照護人力需求	2	t	2025-11-30 15:36:26.312	2025-12-01 15:13:51.049	[]	550	50
4	RETURN_SUPPLEMENT	退補件	退件與補件處理	3	t	2025-11-30 15:36:26.313	2025-12-01 15:13:51.049	[]	800	50
5	RECRUITMENT_LETTER	申請招募函	向勞動部申請招募許可	4	t	2025-11-30 15:36:26.313	2025-12-01 15:13:51.05	[]	50	200
6	HEALTH_CHECK	體檢(報告/核備)	健康檢查相關事項	5	t	2025-11-30 15:36:26.314	2025-12-01 15:13:51.05	[]	300	200
7	ENTRY_ONESTOP	一站式入境	一站式入境服務	6	t	2025-11-30 15:36:26.315	2025-12-01 15:13:51.051	[]	550	200
8	TAKEOVER_NOTIFY	承接通報(雙方合意)	承接通報申請	7	t	2025-11-30 15:36:26.316	2025-12-01 15:13:51.051	[]	800	200
9	CERTIFICATION	印辦認證	文件認證服務	8	t	2025-11-30 15:36:26.316	2025-12-01 15:13:51.052	[]	50	350
10	OTHER	其他	其他類型申請	9	t	2025-11-30 15:36:26.317	2025-12-01 15:13:51.052	[]	300	350
1	CREATE_FILE	建檔1	新案件建檔	0	t	2025-11-30 15:36:26.308	2025-12-02 01:42:21.989	[{"id": "0d118778-7dfc-4d1a-8288-e2857fc272e0", "type": "TEXT", "label": "測試", "options": [], "trigger": null, "required": true}]	227.6198489293284	-105.6269784976387
\.


--
-- Data for Name: TaskTypeFlow; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TaskTypeFlow" (id, "fromTaskTypeId", "toTaskTypeId", label, condition, "order", "createdAt", "updatedAt") FROM stdin;
5	1	2	\N	\N	0	2025-12-01 15:13:51.053	2025-12-01 15:13:51.053
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, name, password, role, department, phone, avatar, "isActive", "lastLoginAt", "createdAt", "updatedAt", "invitationCode", "invitationCount", bio, "isPublic", "lineId", "position", specialties, "customPermissions") FROM stdin;
cmhwrrknb00008g3mhh2zbiow	admin@youshi-hr.com	系統管理員	$2b$10$PyI//oRG.pO16TqWh/76muWOAp47TOtJxwXpF5X2MqTE5k5CaSuPW	SUPER_ADMIN	資訊部	0912-345-678	\N	t	2025-12-02 01:41:24.148	2025-11-13 01:47:43.558	2025-12-02 01:41:24.149	\N	0	\N	t	\N	\N	\N	\N
cmhwrrkpp00018g3mt2pozfcn	owner@youshi-hr.com	陳董事長	$2b$10$L0aRdJPrXaIAinTKT6mt8uKJWcK8LpeP/wZxB4z3Vsm11YIVuPSXa	OWNER	經營管理	0912-111-111	\N	t	\N	2025-11-13 01:47:43.645	2025-11-24 13:00:07.843	QTH6Q9PW	0	\N	t	\N	\N	\N	\N
cmhwrrkrl00028g3m5j23vrim	staff1@youshi-hr.com	王業務	$2b$10$LIhddpd/Ji9kPh/JDFGk4.G8oUYfbWn5hnW5aLQpRpE61oMSPfdCm	STAFF	業務一部	0912-222-222	\N	t	\N	2025-11-13 01:47:43.714	2025-11-24 13:00:07.854	YFCV77S6	0	\N	t	\N	\N	\N	\N
cmhwrrktg00038g3mjr0tz8xi	staff2@youshi-hr.com	李專員	$2b$10$korIdz0P7q3cIj2LG9QrOONCoyO8rkg1bFHHSVNfRaAJ83lTpvUeW	STAFF	業務二部	0912-333-333	\N	t	\N	2025-11-13 01:47:43.78	2025-11-24 13:00:07.856	UZZ9MCAV	0	\N	t	\N	\N	\N	\N
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
-- Name: ActivityLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ActivityLog_id_seq"', 41, true);


--
-- Name: AdminTaskAttachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AdminTaskAttachment_id_seq"', 1, false);


--
-- Name: AdminTaskTypeAssignment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AdminTaskTypeAssignment_id_seq"', 1, false);


--
-- Name: AdminTask_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AdminTask_id_seq"', 1, true);


--
-- Name: Analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Analytics_id_seq"', 1, false);


--
-- Name: ApprovalRecord_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ApprovalRecord_id_seq"', 1, false);


--
-- Name: ContentBlock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ContentBlock_id_seq"', 10, true);


--
-- Name: ManpowerRequest_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ManpowerRequest_id_seq"', 3, true);


--
-- Name: Navigation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Navigation_id_seq"', 27, true);


--
-- Name: Page_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Page_id_seq"', 2, true);


--
-- Name: SystemConfig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."SystemConfig_id_seq"', 4, true);


--
-- Name: TaskTypeFlow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TaskTypeFlow_id_seq"', 5, true);


--
-- Name: TaskType_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TaskType_id_seq"', 10, true);


--
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id);


--
-- Name: AdminTaskAttachment AdminTaskAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTaskAttachment"
    ADD CONSTRAINT "AdminTaskAttachment_pkey" PRIMARY KEY (id);


--
-- Name: AdminTaskTypeAssignment AdminTaskTypeAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTaskTypeAssignment"
    ADD CONSTRAINT "AdminTaskTypeAssignment_pkey" PRIMARY KEY (id);


--
-- Name: AdminTask AdminTask_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTask"
    ADD CONSTRAINT "AdminTask_pkey" PRIMARY KEY (id);


--
-- Name: Analytics Analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Analytics"
    ADD CONSTRAINT "Analytics_pkey" PRIMARY KEY (id);


--
-- Name: ApprovalRecord ApprovalRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalRecord"
    ADD CONSTRAINT "ApprovalRecord_pkey" PRIMARY KEY (id);


--
-- Name: ContentBlock ContentBlock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentBlock"
    ADD CONSTRAINT "ContentBlock_pkey" PRIMARY KEY (id);


--
-- Name: ManpowerRequest ManpowerRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManpowerRequest"
    ADD CONSTRAINT "ManpowerRequest_pkey" PRIMARY KEY (id);


--
-- Name: Navigation Navigation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Navigation"
    ADD CONSTRAINT "Navigation_pkey" PRIMARY KEY (id);


--
-- Name: Page Page_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Page"
    ADD CONSTRAINT "Page_pkey" PRIMARY KEY (id);


--
-- Name: SystemConfig SystemConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemConfig"
    ADD CONSTRAINT "SystemConfig_pkey" PRIMARY KEY (id);


--
-- Name: TaskTypeFlow TaskTypeFlow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTypeFlow"
    ADD CONSTRAINT "TaskTypeFlow_pkey" PRIMARY KEY (id);


--
-- Name: TaskType TaskType_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskType"
    ADD CONSTRAINT "TaskType_pkey" PRIMARY KEY (id);


--
-- Name: User User_invitationCode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_invitationCode_key" UNIQUE ("invitationCode");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ActivityLog_action_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivityLog_action_createdAt_idx" ON public."ActivityLog" USING btree (action, "createdAt" DESC);


--
-- Name: ActivityLog_entity_entityId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivityLog_entity_entityId_createdAt_idx" ON public."ActivityLog" USING btree (entity, "entityId", "createdAt" DESC);


--
-- Name: ActivityLog_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivityLog_userId_createdAt_idx" ON public."ActivityLog" USING btree ("userId", "createdAt" DESC);


--
-- Name: AdminTaskAttachment_taskId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTaskAttachment_taskId_createdAt_idx" ON public."AdminTaskAttachment" USING btree ("taskId", "createdAt" DESC);


--
-- Name: AdminTaskAttachment_taskId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTaskAttachment_taskId_idx" ON public."AdminTaskAttachment" USING btree ("taskId");


--
-- Name: AdminTaskTypeAssignment_adminId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTaskTypeAssignment_adminId_idx" ON public."AdminTaskTypeAssignment" USING btree ("adminId");


--
-- Name: AdminTaskTypeAssignment_adminId_taskTypeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AdminTaskTypeAssignment_adminId_taskTypeId_key" ON public."AdminTaskTypeAssignment" USING btree ("adminId", "taskTypeId");


--
-- Name: AdminTaskTypeAssignment_taskTypeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTaskTypeAssignment_taskTypeId_idx" ON public."AdminTaskTypeAssignment" USING btree ("taskTypeId");


--
-- Name: AdminTask_applicantId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTask_applicantId_status_idx" ON public."AdminTask" USING btree ("applicantId", status);


--
-- Name: AdminTask_approverId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTask_approverId_status_idx" ON public."AdminTask" USING btree ("approverId", status);


--
-- Name: AdminTask_groupId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTask_groupId_idx" ON public."AdminTask" USING btree ("groupId");


--
-- Name: AdminTask_parentTaskId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTask_parentTaskId_idx" ON public."AdminTask" USING btree ("parentTaskId");


--
-- Name: AdminTask_processorId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTask_processorId_status_idx" ON public."AdminTask" USING btree ("processorId", status);


--
-- Name: AdminTask_status_applicationDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTask_status_applicationDate_idx" ON public."AdminTask" USING btree (status, "applicationDate" DESC);


--
-- Name: AdminTask_status_deadline_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTask_status_deadline_idx" ON public."AdminTask" USING btree (status, deadline);


--
-- Name: AdminTask_taskNo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTask_taskNo_idx" ON public."AdminTask" USING btree ("taskNo");


--
-- Name: AdminTask_taskNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AdminTask_taskNo_key" ON public."AdminTask" USING btree ("taskNo");


--
-- Name: AdminTask_taskTypeId_status_applicationDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminTask_taskTypeId_status_applicationDate_idx" ON public."AdminTask" USING btree ("taskTypeId", status, "applicationDate" DESC);


--
-- Name: Analytics_category_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Analytics_category_createdAt_idx" ON public."Analytics" USING btree (category, "createdAt");


--
-- Name: Analytics_category_event_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Analytics_category_event_createdAt_idx" ON public."Analytics" USING btree (category, event, "createdAt" DESC);


--
-- Name: Analytics_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Analytics_createdAt_idx" ON public."Analytics" USING btree ("createdAt" DESC);


--
-- Name: Analytics_event_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Analytics_event_createdAt_idx" ON public."Analytics" USING btree (event, "createdAt");


--
-- Name: Analytics_event_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Analytics_event_userId_createdAt_idx" ON public."Analytics" USING btree (event, "userId", "createdAt" DESC);


--
-- Name: Analytics_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Analytics_userId_createdAt_idx" ON public."Analytics" USING btree ("userId", "createdAt");


--
-- Name: ApprovalRecord_approverId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApprovalRecord_approverId_idx" ON public."ApprovalRecord" USING btree ("approverId");


--
-- Name: ApprovalRecord_taskId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApprovalRecord_taskId_createdAt_idx" ON public."ApprovalRecord" USING btree ("taskId", "createdAt" DESC);


--
-- Name: ContentBlock_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ContentBlock_key_key" ON public."ContentBlock" USING btree (key);


--
-- Name: ManpowerRequest_contactEmail_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManpowerRequest_contactEmail_idx" ON public."ManpowerRequest" USING btree ("contactEmail");


--
-- Name: ManpowerRequest_invitedBy_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManpowerRequest_invitedBy_createdAt_idx" ON public."ManpowerRequest" USING btree ("invitedBy", "createdAt" DESC);


--
-- Name: ManpowerRequest_invitedBy_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManpowerRequest_invitedBy_status_createdAt_idx" ON public."ManpowerRequest" USING btree ("invitedBy", status, "createdAt" DESC);


--
-- Name: ManpowerRequest_processedBy_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManpowerRequest_processedBy_status_idx" ON public."ManpowerRequest" USING btree ("processedBy", status);


--
-- Name: ManpowerRequest_requestNo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManpowerRequest_requestNo_idx" ON public."ManpowerRequest" USING btree ("requestNo");


--
-- Name: ManpowerRequest_requestNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ManpowerRequest_requestNo_key" ON public."ManpowerRequest" USING btree ("requestNo");


--
-- Name: ManpowerRequest_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManpowerRequest_status_createdAt_idx" ON public."ManpowerRequest" USING btree (status, "createdAt" DESC);


--
-- Name: ManpowerRequest_status_processedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManpowerRequest_status_processedAt_idx" ON public."ManpowerRequest" USING btree (status, "processedAt" DESC);


--
-- Name: Navigation_parentId_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Navigation_parentId_order_idx" ON public."Navigation" USING btree ("parentId", "order");


--
-- Name: Page_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Page_slug_key" ON public."Page" USING btree (slug);


--
-- Name: Page_status_publishedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Page_status_publishedAt_idx" ON public."Page" USING btree (status, "publishedAt");


--
-- Name: SystemConfig_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SystemConfig_category_idx" ON public."SystemConfig" USING btree (category);


--
-- Name: SystemConfig_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SystemConfig_key_key" ON public."SystemConfig" USING btree (key);


--
-- Name: TaskTypeFlow_fromTaskTypeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskTypeFlow_fromTaskTypeId_idx" ON public."TaskTypeFlow" USING btree ("fromTaskTypeId");


--
-- Name: TaskTypeFlow_fromTaskTypeId_toTaskTypeId_condition_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TaskTypeFlow_fromTaskTypeId_toTaskTypeId_condition_key" ON public."TaskTypeFlow" USING btree ("fromTaskTypeId", "toTaskTypeId", condition);


--
-- Name: TaskTypeFlow_toTaskTypeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskTypeFlow_toTaskTypeId_idx" ON public."TaskTypeFlow" USING btree ("toTaskTypeId");


--
-- Name: TaskType_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TaskType_code_key" ON public."TaskType" USING btree (code);


--
-- Name: TaskType_isActive_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TaskType_isActive_order_idx" ON public."TaskType" USING btree ("isActive", "order");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_invitationCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_invitationCode_idx" ON public."User" USING btree ("invitationCode");


--
-- Name: User_role_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_role_isActive_idx" ON public."User" USING btree (role, "isActive");


--
-- Name: ActivityLog ActivityLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AdminTaskAttachment AdminTaskAttachment_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTaskAttachment"
    ADD CONSTRAINT "AdminTaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."AdminTask"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AdminTaskTypeAssignment AdminTaskTypeAssignment_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTaskTypeAssignment"
    ADD CONSTRAINT "AdminTaskTypeAssignment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AdminTaskTypeAssignment AdminTaskTypeAssignment_taskTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTaskTypeAssignment"
    ADD CONSTRAINT "AdminTaskTypeAssignment_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES public."TaskType"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AdminTask AdminTask_applicantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTask"
    ADD CONSTRAINT "AdminTask_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AdminTask AdminTask_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTask"
    ADD CONSTRAINT "AdminTask_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AdminTask AdminTask_parentTaskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTask"
    ADD CONSTRAINT "AdminTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES public."AdminTask"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AdminTask AdminTask_processorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTask"
    ADD CONSTRAINT "AdminTask_processorId_fkey" FOREIGN KEY ("processorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AdminTask AdminTask_taskTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminTask"
    ADD CONSTRAINT "AdminTask_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES public."TaskType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ApprovalRecord ApprovalRecord_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalRecord"
    ADD CONSTRAINT "ApprovalRecord_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ApprovalRecord ApprovalRecord_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalRecord"
    ADD CONSTRAINT "ApprovalRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."AdminTask"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ManpowerRequest ManpowerRequest_invitedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManpowerRequest"
    ADD CONSTRAINT "ManpowerRequest_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Navigation Navigation_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Navigation"
    ADD CONSTRAINT "Navigation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Navigation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskTypeFlow TaskTypeFlow_fromTaskTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTypeFlow"
    ADD CONSTRAINT "TaskTypeFlow_fromTaskTypeId_fkey" FOREIGN KEY ("fromTaskTypeId") REFERENCES public."TaskType"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskTypeFlow TaskTypeFlow_toTaskTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TaskTypeFlow"
    ADD CONSTRAINT "TaskTypeFlow_toTaskTypeId_fkey" FOREIGN KEY ("toTaskTypeId") REFERENCES public."TaskType"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

