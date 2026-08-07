--
-- PostgreSQL database dump
--

\restrict EIa2bwKX0zzQndBqMIXTnok8Mosjd3IA3lHMk8ITHHUJGCmsu22abgqhIp7nJUC

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.workshop_visits DROP CONSTRAINT IF EXISTS workshop_visits_vehicle_id_fkey;
ALTER TABLE IF EXISTS ONLY public.workshop_visits DROP CONSTRAINT IF EXISTS workshop_visits_client_id_fkey;
ALTER TABLE IF EXISTS ONLY public.vehicles DROP CONSTRAINT IF EXISTS vehicles_client_id_fkey;
ALTER TABLE IF EXISTS ONLY public.policies DROP CONSTRAINT IF EXISTS policies_client_id_fkey;
ALTER TABLE IF EXISTS ONLY public.office_messages DROP CONSTRAINT IF EXISTS office_messages_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.office_messages DROP CONSTRAINT IF EXISTS office_messages_reply_to_id_fkey;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_client_id_fkey;
DROP INDEX IF EXISTS public.idx_appointments_venditore;
ALTER TABLE IF EXISTS ONLY public.workshop_visits DROP CONSTRAINT IF EXISTS workshop_visits_pkey;
ALTER TABLE IF EXISTS ONLY public.vehicles DROP CONSTRAINT IF EXISTS vehicles_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE IF EXISTS ONLY public.policies DROP CONSTRAINT IF EXISTS policies_policy_number_key;
ALTER TABLE IF EXISTS ONLY public.policies DROP CONSTRAINT IF EXISTS policies_pkey;
ALTER TABLE IF EXISTS ONLY public.office_messages DROP CONSTRAINT IF EXISTS office_messages_pkey;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_pkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_pkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_intorno_key;
ALTER TABLE IF EXISTS public.workshop_visits ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.vehicles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.policies ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.office_messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.appointments ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.workshop_visits_id_seq;
DROP TABLE IF EXISTS public.workshop_visits;
DROP SEQUENCE IF EXISTS public.vehicles_id_seq;
DROP TABLE IF EXISTS public.vehicles;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.settings;
DROP SEQUENCE IF EXISTS public.policies_id_seq;
DROP TABLE IF EXISTS public.policies;
DROP SEQUENCE IF EXISTS public.office_messages_id_seq;
DROP TABLE IF EXISTS public.office_messages;
DROP SEQUENCE IF EXISTS public.documents_id_seq;
DROP TABLE IF EXISTS public.documents;
DROP SEQUENCE IF EXISTS public.appointments_id_seq;
DROP TABLE IF EXISTS public.appointments;
DROP EXTENSION IF EXISTS pgagent;
DROP SCHEMA IF EXISTS pgagent;
--
-- Name: pgagent; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA pgagent;


ALTER SCHEMA pgagent OWNER TO postgres;

--
-- Name: SCHEMA pgagent; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA pgagent IS 'pgAgent system tables';


--
-- Name: pgagent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgagent WITH SCHEMA pgagent;


--
-- Name: EXTENSION pgagent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgagent IS 'A PostgreSQL job scheduler';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    intorno character varying(100),
    cliente character varying(255),
    venditore character varying(50),
    data_ora timestamp without time zone,
    last_sync timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    luogo character varying(255),
    note text,
    cancellato boolean DEFAULT false,
    tipo character varying(100)
);


ALTER TABLE public.appointments OWNER TO postgres;

--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointments_id_seq OWNER TO postgres;

--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    client_id integer,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: office_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.office_messages (
    id integer NOT NULL,
    user_id integer,
    message_text text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reply_to_id integer,
    deleted boolean DEFAULT false
);


ALTER TABLE public.office_messages OWNER TO postgres;

--
-- Name: office_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.office_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.office_messages_id_seq OWNER TO postgres;

--
-- Name: office_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.office_messages_id_seq OWNED BY public.office_messages.id;


--
-- Name: policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.policies (
    id integer NOT NULL,
    client_id integer,
    policy_number character varying(100) NOT NULL,
    policy_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'Active'::character varying,
    coverage_details text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.policies OWNER TO postgres;

--
-- Name: policies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.policies_id_seq OWNER TO postgres;

--
-- Name: policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.policies_id_seq OWNED BY public.policies.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    key character varying(100) NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'client'::character varying,
    phone character varying(50),
    address character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    venditore_code character varying(10)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicles (
    id integer NOT NULL,
    client_id integer,
    make character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    year character varying(10) NOT NULL,
    license_plate character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.vehicles OWNER TO postgres;

--
-- Name: vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vehicles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vehicles_id_seq OWNER TO postgres;

--
-- Name: vehicles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vehicles_id_seq OWNED BY public.vehicles.id;


--
-- Name: workshop_visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workshop_visits (
    id integer NOT NULL,
    client_id integer,
    vehicle_id integer,
    visit_date timestamp with time zone NOT NULL,
    fixes_performed text NOT NULL,
    next_instructions text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.workshop_visits OWNER TO postgres;

--
-- Name: workshop_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workshop_visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workshop_visits_id_seq OWNER TO postgres;

--
-- Name: workshop_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workshop_visits_id_seq OWNED BY public.workshop_visits.id;


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: office_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_messages ALTER COLUMN id SET DEFAULT nextval('public.office_messages_id_seq'::regclass);


--
-- Name: policies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policies ALTER COLUMN id SET DEFAULT nextval('public.policies_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vehicles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles ALTER COLUMN id SET DEFAULT nextval('public.vehicles_id_seq'::regclass);


--
-- Name: workshop_visits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_visits ALTER COLUMN id SET DEFAULT nextval('public.workshop_visits_id_seq'::regclass);


--
-- Data for Name: pga_jobagent; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_jobagent (jagpid, jaglogintime, jagstation) FROM stdin;
10176	2026-07-24 14:54:08.215978+02	PC-JUNAID
\.


--
-- Data for Name: pga_jobclass; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_jobclass (jclid, jclname) FROM stdin;
\.


--
-- Data for Name: pga_job; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_job (jobid, jobjclid, jobname, jobdesc, jobhostagent, jobenabled, jobcreated, jobchanged, jobagentid, jobnextrun, joblastrun) FROM stdin;
\.


--
-- Data for Name: pga_schedule; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_schedule (jscid, jscjobid, jscname, jscdesc, jscenabled, jscstart, jscend, jscminutes, jschours, jscweekdays, jscmonthdays, jscmonths) FROM stdin;
\.


--
-- Data for Name: pga_exception; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_exception (jexid, jexscid, jexdate, jextime) FROM stdin;
\.


--
-- Data for Name: pga_joblog; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_joblog (jlgid, jlgjobid, jlgstatus, jlgstart, jlgduration) FROM stdin;
\.


--
-- Data for Name: pga_jobstep; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_jobstep (jstid, jstjobid, jstname, jstdesc, jstenabled, jstkind, jstcode, jstconnstr, jstdbname, jstonerror, jscnextrun) FROM stdin;
\.


--
-- Data for Name: pga_jobsteplog; Type: TABLE DATA; Schema: pgagent; Owner: postgres
--

COPY pgagent.pga_jobsteplog (jslid, jsljlgid, jsljstid, jslstatus, jslresult, jslstart, jslduration, jsloutput) FROM stdin;
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appointments (id, intorno, cliente, venditore, data_ora, last_sync, luogo, note, cancellato, tipo) FROM stdin;
46939086	35571_202607281200_VL	David Mosè	VL	2026-07-28 12:00:00	2026-07-28 12:05:13.487602	\N	Sa che il prezzo è con finanziamento, valutava il finanziamento	f	Telefonico
46520434	36646_202607271000_MR	Bicchi Franco	MR	2026-07-27 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
46708214	36669_202607281100_MR	Bozzolini Simone	MR	2026-07-28 11:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. Lo vuole fare. Ha una mg hs del 2024 con 56.000 km	f	Presenza
46520465	36659_202607281700_AP	SALVEMINI MICHELE	AP	2026-07-28 17:00:00	2026-07-28 15:27:50.28086	\N	SA DI F0, HA LA LIQUIDITà PER NON FARE IL FINANZIAMENTO, MA SE CONVENIENTE LO VALUTA, è PER LA MOGLIE, NON HA USATO	f	Presenza
46520467	36679_202607281800_IS	CELONA GIUSEPPE	IS	2026-07-28 18:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA CHIESTO LA PRONTA CONSEGNA, LìUSATO SE LO VENDE DA SOLO, ha chiesto il cambio automatico pronta consegna	f	Presenza
46520468	36683_202607281000_MM	MAGNINI PIERO	MM	2026-07-28 10:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN, NON HA USATO DA RENDERE, è PER LA FIGLIA	f	Presenza
46520470	36685_202607301000_RI	Arnone Loredana	RI	2026-07-30 10:00:00	2026-07-28 12:05:13.487602	\N	Sa che il prezzo è con finanziamento, sa che non è esposta, ha da rottamare un'auto.	f	Presenza
46820196	36694_202607281800_MR	FIGNANO DOMENICO	MR	2026-07-28 18:00:00	2026-07-28 17:30:53.356371	\N	SA DI F0, VUOLE DARE 10,000€ DI ANTICIPO, HA L'USATO DA VALUTARE (consulenza telefonico con BM )	f	Presenza
46814180	36699_202607281100_RI	Menti Rosalba	RI	2026-07-28 11:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, ha letto descrizione. HA una auris del 2008 con 170.000km	f	Telefonico
46896153	36700_202607281200_RI	Piccolo Giuseppe	RI	2026-07-28 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, valuta quello classico. Ha una 208 del 2017 con 110.000km	f	Telefonico
46965341	36705_202607281500_RI	Caputo Davide	RI	2026-07-28 15:00:00	2026-07-29 15:31:01.471502	\N	sa di f0	f	Telefonico
46520469	36684_202607301100_RI	Masteri Zanut	RI	2026-07-30 11:00:00	2026-07-28 16:07:45.777839	\N	Sa che il prezzo è con finanziamento, interessato a finanziamento, ha da rendere una Smart del 2002.	f	Presenza
46939117	36710_202607281400_BM	filosi giuliana	BM	2026-07-28 14:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha diesel del 2009 fiat grande punto	f	Telefonico
47192590	36727_202607281700_RI	Carissimo Maria	RI	2026-07-28 17:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con fin e lo valuta. Ha un usato una Clio del 2010 con 136.000 km	f	Telefonico
47059503	36730_202607281600_MR	PUTZU GIAMPAOLO	MR	2026-07-28 16:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0	f	Telefonico
46888293	36704_202607281500_AP	Antonucci Antonella	AP	2026-07-28 15:00:00	2026-07-28 15:55:57.218519	\N	Sa di f0, ha Ypsilon del 2024.	f	Presenza
47495074	36745_202607281800_MR	Mazzei Maurizio	MR	2026-07-28 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
46939115	36707_202607281700_IS	CEFALO PASQUALE	IS	2026-07-28 17:00:00	2026-07-28 17:49:28.730812	\N	SA DI F0, VORREBBE DARE 10K DI ANTICIPO	f	Telefonico
46879836	36705_202607281200_IS	Caputo Davide	IS	2026-07-28 12:00:00	2026-07-28 15:05:49.711316	\N	sa di f0	f	Telefonico
46995409	35460_202607291400_MR	Banatti Andrea	MR	2026-07-29 14:00:00	2026-07-29 15:31:01.471502	\N	SECONDO APP POST TELEFONICO (IS), sa di f0, sa che non è esposta- (appuntamento delle 14.30)	f	Presenza
46939105	36696_202608011100_MM	Spingola Rachele	MM	2026-08-01 11:00:00	2026-07-29 15:31:01.471502	\N	SECONDO APP POST TELEFONICO CON BM. SA che il prezzo è con finanziamento , lo valuta. HA una clio del 2015	f	Presenza
46939116	36708_202607281200_MR	Tamescu Damian	MR	2026-07-28 12:00:00	2026-07-28 11:53:52.852672	\N	Acquistato auto tanto tempo fa. Sa che il prezzo è con fin. Ha un usato una Seat Ateca del 2019 con 160,000 km	f	Presenza
46939109	36698_202607301600_RI	Bertoni Luca	RI	2026-07-30 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha usato del 2011 opel corsa. Interessato anche a c10 (secondo appuntamento, consulenza fatta con IS)	f	Presenza
47436907	36742_202607281800_MR	Marianeschi Egidio	MR	2026-07-28 18:00:00	2026-07-28 17:33:52.85883	\N	sa che è con fiannziamento	f	Presenza
46859937	36703_202607281200_BM	Seculin Jody	BM	2026-07-28 12:00:00	2026-07-28 12:05:13.487602	\N	SA DI F0	f	Telefonico
47007746	36726_202607281600_RI	Lyakhov Andriy Dmytrovych	RI	2026-07-28 16:00:00	2026-07-28 15:21:51.17205	\N	sa di f0	f	Telefonico
46939114	36706_202607291800_IS	Bartolini Cristina	IS	2026-07-29 18:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, Chevrolet trax del 2014 con 78.000 km	f	Presenza
47185776	36736_202607291500_IS	Mizzon Mara	IS	2026-07-29 15:00:00	2026-07-28 16:15:49.254714	\N	Sa di fin, ha picasso del 2005, valuta vari tipi di finanziamento	f	Presenza
39914744	36278_202607151600_AP	Blasi Milena	AP	2026-07-15 16:00:00	2026-07-29 15:31:01.471502	\N	Era già venuta in sede senza appuntamento e le era stato spiegato il discorso del finanziamento. Ha due usati e sta valutando quale un audi q5 con 300.000 km e una 500x con 90.000 km, STASERA MANDA ANCHE 500 X NEL PROSPETTO RINUNCIA AD INCENTIVO	f	Presenza
46961036	36691_202607281600_MM	Caccioppini Paola	MM	2026-07-28 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, vuole dare 8000 euro di acconto. Ha dacia duster del 3 anni e mezzo a gpl.	f	Telefonico
46939119	36711_202607281500_MM	REVISAM FABIO	MM	2026-07-28 15:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, SA PREZZO CASH DI 33000€	f	Telefonico
46956175	36712_202607281500_MR	Borrelli Mauro	MR	2026-07-28 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo ocn fin e lo valuta. Ha un usato una Dacia Sandero del 2015 con 100.000 km circa.	f	Telefonico
46961665	36714_202607281400_LL	Bifulco Giuseppe	LL	2026-07-28 14:00:00	2026-07-29 15:31:01.471502	\N	Sa del prezzo ocn fin e lo valuta. Ha un Usato non marciante una Ford ka del 2011.	f	Telefonico
46961669	36724_202607281500_BM	Mureddu Cristian	BM	2026-07-28 15:00:00	2026-07-29 15:31:01.471502	\N	sa che il prezzo è con finanziamento e lo valuta	f	Telefonico
47112016	36733_202607281700_LL	CANNAVACCIUOLO ALESSANDRO	LL	2026-07-28 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN CON MAXI RATA, HA UNA ROTTAMAZIONE	f	Telefonico
47122565	36734_202607281700_MM	d'Antoni Nascia	MM	2026-07-28 17:00:00	2026-07-29 15:31:01.471502	\N	INTERESSATA ALLA DACIA SANDERO USATO FINTO. HA VISTO QUELLA A 9.950. Sa che il prezzo è con fin e lo valuta, ha un usato una	f	Telefonico
46961644	36687_202607291200_AP	Amoretti Stefano	AP	2026-07-29 12:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha clio da permutare ey012vw	f	Presenza
46961656	36703_202607311700_GC	Seculin Jody	GC	2026-07-31 17:00:00	2026-07-29 15:31:01.471502	\N	(secondo appuntamento. Fatto app telefonico con la Beatrice martedì 28 luglio) SA DI F0	f	Presenza
46961666	36719_202607291000_BM	Comparini Filippo	BM	2026-07-29 10:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta, non ha usato.	f	Presenza
47013289	36725_202607281700_BM	Bernardi Pierluigi	BM	2026-07-28 17:00:00	2026-07-28 17:49:28.730812	\N	sa del prezzo con fin e lo valuta. Ha un ustao che vorrebbe dare come anticipo una BMW del 2018 con 64.000 km	f	Telefonico
46992370	36725_202607281600_LL	Bernardi Pierluigi	LL	2026-07-28 16:00:00	2026-07-28 15:21:51.17205	\N	sa del prezzo con fin e lo valuta. Ha un ustao che vorrebbe dare come anticipo una BMW del 2018 con 64.000 km	f	Telefonico
47100238	36732_202607281600_RI	Annese Michele	RI	2026-07-28 16:00:00	2026-07-28 16:30:53.280503	\N	sa che il prezzo è con finanziamento, lo valuta e vorrebbe dare 2.000 euro d'anticipo. Ha un ustao una Kia Niro del 2018 con 90.000 km	f	Telefonico
47093439	36731_202607291400_AP	Scaletta Alfredo	AP	2026-07-29 14:00:00	2026-07-28 17:49:28.730812	\N	Sa di fin, ha golf del 2005	f	Presenza
47026227	36727_202607281700_MR	Carissimo Maria	MR	2026-07-28 17:00:00	2026-07-28 16:16:54.258869	\N	Sa che il prezzo è con fin e lo valuta. Ha un usato una Clio del 2010 con 136.000 km	f	Telefonico
46961667	36721_202607301600_BM	Orsi Alessia	BM	2026-07-30 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, non lo valuta . SA che come alternativa c'è la F15.	f	Presenza
46961668	36722_202608041000_RI	Guindani Francesco	RI	2026-08-04 10:00:00	2026-07-29 15:31:01.471502	\N	(SECONDO APPUNTAMENTO. FATTO IL TELEFONICO) sa del prezzo con fin e lo valuta. Ha un usato da rendere non intestato a lui, Una yaris del 2013	f	Presenza
47495088	36725_202607301600_VL	Bernardi Pierluigi	VL	2026-07-30 16:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta. Ha un ustao che vorrebbe dare come anticipo una BMW del 2018 con 64.000 km (secondo appuntamento BM)	f	Presenza
47238514	36732_202608191100_SA	Annese Michele	SA	2026-08-19 11:00:00	2026-07-29 15:31:01.471502	\N	(SECONDO APPUNTAMENTO. APP TELEFONICO CON RAFFAELA IL 28 LUGLIO) sa che il prezzo è con finanziamento, lo valuta e vorrebbe dare 2.000 euro d'anticipo. Ha un ustao una Kia Niro del 2018 con 90.000 km	f	Telefonico
47190116	36736_202607291500_MM	Mizzon Mara	MM	2026-07-29 15:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha picasso del 2005, valuta vari tipi di finanziamento	f	Presenza
39914707	36244_202607141700_MM	D'ARPA COSTANTINO	MM	2026-07-14 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914745	36279_202607151600_IS	Venturoni Nicola	IS	2026-07-15 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, nissan pixo del 2009.	f	Telefonico
39914747	36063_202607151400_LL	Morariu Otilia	LL	2026-07-15 14:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, vorrebbe senza anticipo	f	Presenza
47013290	36726_202607281600_LL	Lyakhov Andriy Dmytrovych	LL	2026-07-28 16:00:00	2026-07-29 15:31:01.471502	\N	sa di f0	f	Telefonico
47206237	36737_202607281700_MR	Sanna Giacomo	MR	2026-07-28 17:00:00	2026-07-29 15:31:01.471502	\N	Sa del prezzo con fin e lo valuta, non hanno usato	f	Telefonico
47319491	36742_202607281700_VL	Marianeschi Egidio	VL	2026-07-28 17:00:00	2026-07-29 15:31:01.471502	\N	sa che è con fiannziamento	f	Presenza
47263991	36739_202608051000_MR	Grassi Francesco	MR	2026-08-05 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
47287666	36741_202607291500_IS	DERVISHAJ MARIO	IS	2026-07-29 15:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, è PER LA MADRE, HA UNA AYGO DEL 2006 BENZ AUTOMATICA 130,000KM	f	Presenza
47430728	36743_202607301700_AP	Zaghini Alessandro	AP	2026-07-30 17:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, valuta il finanziamento. SA che la vettura non è esposta	f	Presenza
47495095	36744_202607291000_RI	SING AMARJEET	RI	2026-07-29 10:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HANNO CONTRATTO INDETERMINATO, SANNO CHE NON C'è LA MACCCHINA	f	Presenza
39914812	35851_202607031600_MM	STARNOTTI MASSIMO	MM	2026-07-03 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914908	36444_202607201700_SC	Ceresa - Gastaldo Lucia	SC	2026-07-20 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Telefonico
39914909	36447_202607201700_NV	GIORDANO SPERANZA	NV	2026-07-20 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0	f	Telefonico
39914910	36451_202607201700_RI	Nizzetto Vania	RI	2026-07-20 17:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fiannziamento e lovaluta. Ha un usato una Kia Sportage del 2012 con 239.000 km che perde olio. Non vuole dare anticipo	f	Telefonico
39915015	35837_202607081000_LL	Moriello Nicolò	LL	2026-07-08 10:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, interessato a finanziamento, ha da rendere una 500 L Multijet diesel del 2016 con 230.000km.	f	Presenza
39915016	35869_202607081600_AP	Sabau George	AP	2026-07-08 16:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, sa che è l'ultima rimasta, ha da rendere una Mercedesz del 2008 berlina perfettamente marciante con danno di carrozzeria dietro, DETTA ANCHE AYGO X ICON 255 205.000km.	f	Presenza
39915017	35896_202607081500_AP	Consalvo Luciano	AP	2026-07-08 15:00:00	2026-07-29 15:31:01.471502	\N	sa che il prezzo è con finanziamento e lo valuta. Ha una rottamazione una 500 del 2007 con 145.000 km,NON PORTATA MA DA ROTTAMARE	f	Presenza
39915018	35945_202607081800_NV	Pamela Vicari	NV	2026-07-08 18:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, interessata a fin, vuole dare anticipo sui 3000 euro, interessata anche a c3 nuova o peugeot 208	f	Presenza
39915021	35952_202607081000_MM	Valdiserri Fabio	MM	2026-07-08 10:00:00	2026-07-29 15:31:01.471502	\N	sa della f0, valuta finanziamento e ha usato una Kadjar 2017 1.5dci con 17.500 km	f	Presenza
39915022	35962_202607081600_LL	Castellano Daniele	LL	2026-07-08 16:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento personalizzabile, non ha usato, interessato a finanziamento.	f	Presenza
39915023	35965_202607081200_VL	PROVA USATO	VL	2026-07-08 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915038	36004_202607081200_MM	Zampieri Michael	MM	2026-07-08 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento n( lo deve fare) .  Ha una polo del 2006 con 310.000km , vuole sapere se ci sono incentivi.	f	Telefonico
44499283	36559_202607230000_NO_VEND	\N	\N	2026-07-23 00:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
44499377	36633_202607271400_AP	Ciuffa Romina	AP	2026-07-27 14:00:00	2026-07-28 09:44:13.798921	\N	sa delò prezzo con fin e lo valuta, sa prezzo bonifico 20.000.	f	Presenza
44499379	36642_202607271600_RI	Belloni Giusy	RI	2026-07-27 16:00:00	2026-07-28 09:44:13.798921	\N	Sa che il prezzo è con finanziamento, lo valuta e vorrebbe dare anticipo di 5.000. Ha un usato una Alfa Mito del 2013 con 200.000 km.	f	Presenza
44499361	36632_202607241800_IS	D'ALESSANDRO UMBERTO	IS	2026-07-24 18:00:00	2026-07-29 15:31:01.471502	\N	sa chew il prezzo è con finanziamento, deve rendere un usato una Rio del 2020 con 93.000 km. Voleva finanziare 5.000 euro ma è disposto a valuatre più soluzioni.	f	Telefonico
44499362	36394_202607241800_MM	CARUSO PAOLA	MM	2026-07-24 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
44499363	36206_202607241800_MR	Silveri Adriano	MR	2026-07-24 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
47495083	36707_202607291400_AP	CEFALO PASQUALE	AP	2026-07-29 14:00:00	2026-07-29 15:31:01.471502	\N	secondo app post telefonico con iacopo.  SA DI F0, VORREBBE DARE 10K DI ANTICIPO	f	Presenza
47257770	36738_202608051100_NO_VEND	RUZZU MARIO ALBERTO	\N	2026-08-05 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915020	35949_202607081700_LL	Alessandro Taddei	LL	2026-07-08 17:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, non ha usato. Ha macchina aziendale, fa 20000 km/30000 km l'anno, vuole dare massimo anticipo possibile, potrebbe essere interessato a plug in	f	Presenza
39915087	36064_202607101000_SA	Bagnoli Maurizio	SA	2026-07-10 10:00:00	2026-07-29 15:31:01.471502	\N	sa del fin e lo valuta, sa che non è esposta. Ha una una vettura da far valutare una a2 del 2006 con 200.000 km.  (clt pensionati vogliono l'auto per portare i nipoti a scuola , non erano molto propensi ad ascoltare.)	f	Presenza
39915088	36071_202607101600_MR	Monti Lorenzo	MR	2026-07-10 16:00:00	2026-07-29 15:31:01.471502	\N	SA DI FIN, SULLE 260 EURO DI RATA, vuole finanziare. Ha classe a del 2007 con 110000 km,	f	Telefonico
39915090	36085_202607101100_LL	Tedeschi Angelo	LL	2026-07-10 11:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha volvo v40 del 2018, 294000 km, vorrebbe dare anticipo, lui ha srls ma ha detto che volendo può intestarla a privato	f	Presenza
39915091	36086_202607101500_IS	Brunello Gloria	IS	2026-07-10 15:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, valutava il finanziamento	f	Telefonico
39915092	36087_202607101800_MR	Cascio Bernardo	MR	2026-07-10 18:00:00	2026-07-29 15:31:01.471502	\N	Sa del prezzo con finanzamento, lo valuta e ha una rottamazione una Opel Agila 2005 con 218.000 km	f	Presenza
39915093	36090_202607101100_IS	Frigo Serena	IS	2026-07-10 11:00:00	2026-07-29 15:31:01.471502	\N	Sa del prezzo con finanziazmento. Inizalemnte non lo valutava e sa prezzo bonifico € 28.700,00. Ha un usato una kia sportage del 2016 con 166.000km.	f	Telefonico
39915094	36093_202607101200_MM	Romano Antonio	MM	2026-07-10 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, valuta. Valuta sia yaris che yaris cross	f	Telefonico
39915095	36092_202607101500_SA	Zuffa Wiliam	SA	2026-07-10 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento, lo valuta e ha usato una Panda di 10 anni con 195.000 km	f	Presenza
39915101	36100_202607101600_IS	Mapelli Viviana	IS	2026-07-10 16:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha smart fortwo del 2006.	f	Telefonico
39915102	36102_202607101600_MM	Ma Christine Benavidez	MM	2026-07-10 16:00:00	2026-07-29 15:31:01.471502	\N	INTERESSATO ALLA T-ROC USATA LIFE. 199 al mese pubblicizzata. Sa del finanziamento e lo valuta. Non ha usato	f	Telefonico
39915103	36105_202607101700_MM	Sampath Rodrigo	MM	2026-07-10 17:00:00	2026-07-29 15:31:01.471502	\N	PER TROC USATA 16950€, SA DEL FINANZIAMENTO	f	Telefonico
44499288	36566_202607231100_NV	CARDINALE PIETRO	NV	2026-07-23 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN, HA UNA ROTTAMAZIONE	f	Telefonico
44499291	36570_202607231100_NV	LICATA ELIANA	NV	2026-07-23 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915106	36116_202607101700_IS	Cellinese Emiliano	IS	2026-07-10 17:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, vorrebbe dare 4000 euro di anticipo	f	Telefonico
46520466	36669_202607281000_MR	Bozzolini Simone	MR	2026-07-28 10:00:00	2026-07-28 10:23:55.806418	\N	SA che il prezzo è con finanziamento. Lo vuole fare. Ha una mg hs del 2024 con 56.000 km	f	Presenza
39915107	36119_202607101800_IS	DE LUCA MARCO	IS	2026-07-10 18:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE NO ANTICIPO, FIN TOTALE	f	Telefonico
39915110	35672_202607111100_MR	Di Giovanni Erica	MR	2026-07-11 11:00:00	2026-07-29 15:31:01.471502	\N	PCP DI FRANCESCO. Ha una jeep Avenger e viene sabato a fare il tagliando. Le scade il contratto a settembre del prossimo anno e vuole rivalutare il tutto. Propensa a tenerla ma in caso ancora non sa cosa vorrebbe	f	Presenza
39915112	36066_202607111100_IS	TRAINA SILVIA	IS	2026-07-11 11:00:00	2026-07-29 15:31:01.471502	\N	referenza francesco	f	Presenza
44499284	36562_202607231500_NV	Lorenzini Arianna	NV	2026-07-23 15:00:00	2026-07-29 15:31:01.471502	\N	sa di f0	f	Telefonico
44499285	36561_202607230000_FM	Maccora Emilio	FM	2026-07-23 00:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
44499286	36563_202607231000_MR	Palamini Davide	MR	2026-07-23 10:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. HA una ypsilon del 2018	f	Telefonico
44499287	36565_202607231600_SA	Mihai Iulian	SA	2026-07-23 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha skoda del 2008, interessato a finanziamento	f	Presenza
39914904	36437_202607201500_VL	CARLESI SARA	VL	2026-07-20 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915104	36110_202607101700_BM	PANTERA CHIARA	BM	2026-07-10 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA X20 DEL 2019 KM35000 CHE VORREBBE USARE COME ANTICIPO	f	Presenza
39915105	36113_202607101700_SA	TASSINARI MATTEO	SA	2026-07-10 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VORREBBE DARE ANTICIPO E HA UNA GRANDE PUNTO DEL 2008, ARRIVA ALLE 17,15	f	Presenza
44499302	36525_202607231400_GC	BATTIST ALMIR	GC	2026-07-23 14:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN	f	Presenza
44499303	36527_202607231200_SA	Gonizzi Gigliola	SA	2026-07-23 12:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin e che non la vede, ha yaris del 2017, vorrebbe farlo in tre anni, sa che non la vede	f	Presenza
44499304	36535_202607231700_RI	SANCHEZ NICOLE	RI	2026-07-23 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, NON HA USATO, VALUTA FIN	f	Presenza
44499305	36541_202607231000_RI	Boschetti Fabrizio	RI	2026-07-23 10:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lovaluta, non ha usato	f	Presenza
44499306	36551_202607231100_RI	Zarei Nasim	RI	2026-07-23 11:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha classe b di 16 anni	f	Presenza
44499307	36554_202607231000_IS	iacopo occupato	IS	2026-07-23 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
44499308	36555_202607231700_SA	Manic Eugeniu	SA	2026-07-23 17:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin e che non la vede, ha bmw serie 3 del 2014, vorrebbe dare anticipo di 5000 euro	f	Presenza
44499367	36574_202607250900_IS	Stampone Andrea	IS	2026-07-25 09:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento e lo valuta. Volendo potrebbe dare anche piccolo anticipo	f	Presenza
44499369	36537_202607251100_MR	Orselli Tommaso	MR	2026-07-25 11:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta. Non ha usato	f	Presenza
39914737	36267_202607151200_IS	Gerosa Maurizio	IS	2026-07-15 12:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, gli interessa molto la valutazione della sua auto ha una mini clubman Cooper D hype interni jhon Cooper works del 06/2017 Km 112000	f	Telefonico
39914738	36266_202607151400_RI	Borghi Roberto	RI	2026-07-15 14:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento e lo valuta. Ha un usato una 208 del 2015 con 102.000 km	f	Presenza
46520435	36648_202607271100_MR	Rubia Lia	MR	2026-07-27 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
46520454	36678_202607271700_RI	FAREG AYAH	RI	2026-07-27 17:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, ha una duser gpl del 2025 km8000 vorrebbe fare a differenza  efinanziare il restante	f	Telefonico
46520455	36681_202607271700_LL	SALEMME ANDREA	LL	2026-07-27 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, SA PREZZO CASH DI 30900€	f	Telefonico
46520456	36682_202607271700_LL	Salemme Andrea	LL	2026-07-27 17:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento,	f	Telefonico
46520459	35571_202607281200_MR	David Mosè	MR	2026-07-28 12:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, valutava il finanziamento	f	Telefonico
46520460	36589_202607280900_SA	Grazioso Carmine	SA	2026-07-28 09:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento,ha da rendere una Bmw serie 1 120d del 2012.	f	Presenza
44499376	36623_202607281000_AP	Ranocchiari Marzia	AP	2026-07-28 10:00:00	2026-07-29 15:31:01.471502	\N	sa che il prezzo è con finanziamento lo valuta con un anticipo di 5.000 euro. Interessata alla Icon ma la voleva bianca. Non ha usato da rendere.	f	Presenza
46520463	36649_202607281000_RI	Ragona Samuele	RI	2026-07-28 10:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, Nissan Micra del 2017 per neopatentati depotenziata con residuo capitale di finanziamento di 5600€. Ha necessità di cambiarla, sa che non la vede	f	Presenza
46520464	36655_202607291700_AP	Marinacci Fabio	AP	2026-07-29 17:00:00	2026-07-29 15:31:01.471502	\N	Sa del prezzo ocn fin e lo valuta con 2.500 d'anticipo. Ha una rottamazione una C3 del 2003 con 220.000 km. Voleva intestare il Finanziamento a nome suo e la vettura a sua moglia	f	Presenza
39915099	36098_202607101500_MM	Dromedari Giuseppe	MM	2026-07-10 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento, lo valauta con un acconto di 5.000 euro e non ha usato	f	Telefonico
46520438	36652_202607271200_MM	Nolgo Domenico	MM	2026-07-27 12:00:00	2026-07-29 15:31:01.471502	\N	Ha visto promo dacia sandero a 169€ ( non esiste la dacia). SA che il prezzo è con finanziamento.	f	Telefonico
46520439	36654_202607271200_BM	Michele dell'erba	BM	2026-07-27 12:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha rottamazione	f	Telefonico
46520440	36656_202607271200_AP	Tondinelli Francesco	AP	2026-07-27 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. SA che senza va a 31.700€.	f	Presenza
46520441	36657_202607271200_RI	AGUZZOLI DANIELA	RI	2026-07-27 12:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, SA CHE DEVE AGGIUNGERE PASSAGGIO E INTERESSI, NON HA USATO E SA CHE è L'ULTIMA. DICE CHE NON VUOLE FINANZIAMENTO	f	Telefonico
46520452	36675_202607271700_BM	TOMMASINI MARIO	BM	2026-07-27 17:00:00	2026-07-29 15:31:01.471502	\N	PER DACIA SANDERO USATA A 9950€, SA CHE è CON FINANZIAMENTO	f	Telefonico
46520453	36677_202607271800_MM	Kising Donatella	MM	2026-07-27 18:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, sa che non è esposta, valuta finanziamento, ha da rendere Fabia con VFG 2024 20.000 km.	f	Presenza
39915005	36458_202607211700_GC	Baldissin Nicolò	GC	2026-07-21 17:00:00	2026-07-27 09:29:35.743713	\N	sa di fin e vuole farlo, interessato anche alla leapmotor, la vuole usare per casa lavoro. 500x del 2017, 71000 km, diesel 1,6. Ha ricevuto offerta di 10000 euro da privato	f	Presenza
46520473	36693_202607281000_LL	Nora Iari	LL	2026-07-28 10:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, interessato anche a fiat panda, rende usato panda a metano del 2010	f	Telefonico
39915007	36462_202607211700_MM	Nesi Silvano	MM	2026-07-21 17:00:00	2026-07-27 09:29:35.743713	\N	HA visto Dacia Sandero ( usato garantito finto)	f	Presenza
44499373	35460_202607291000_MR	Banatti Andrea	MR	2026-07-29 10:00:00	2026-07-28 15:15:53.103644	\N	SECONDO APP POST TELEFONICO, sa di f0, sa che non è esposta	f	Presenza
46520471	36687_202607281400_AP	Amoretti Stefano	AP	2026-07-28 14:00:00	2026-07-28 12:05:13.487602	\N	Sa di fin, ha clio da permutare ey012vw	f	Presenza
44499370	36567_202607271700_AP	Bolotti Tiziano	AP	2026-07-27 17:00:00	2026-07-28 09:44:13.798921	\N	sa di f0, vuole dare 15k di anticipo	f	Presenza
44499371	35571_202607271200_MR	David Mosè	MR	2026-07-27 12:00:00	2026-07-28 09:44:13.798921	\N	Sa che il prezzo è con finanziamento, valutava il finanziamento	f	Telefonico
44499372	36589_202607271000_SA	Grazioso Carmine	SA	2026-07-27 10:00:00	2026-07-28 09:44:13.798921	\N	Sa che il prezzo è con finanziamento,ha da rendere una Bmw serie 1 120d del 2012.	f	Presenza
46520472	36691_202607281200_MM	Caccioppini Paola	MM	2026-07-28 12:00:00	2026-07-28 12:04:56.108525	\N	Sa di fin, vuole dare 8000 euro di acconto. Ha dacia duster del 3 anni e mezzo a gpl.	f	Telefonico
39914698	36219_202607141200_NV	Zanetti And	NV	2026-07-14 12:00:00	2026-07-29 15:31:01.471502	\N	Sa del prezzo con finanziamento, lo valuta e ha un usato una Golf 7 del 2016 con 220.000. Vuole dare anticipo di 10.000 e finanziare il resto.	f	Telefonico
39914699	36223_202607141700_AP	Cecca Federico	AP	2026-07-14 17:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha chevroley aveo del 2012, diesel, 147000 km	f	Presenza
39914700	36226_202607141200_BM	ANDREA	BM	2026-07-14 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Telefonico
44499375	36617_202607271500_MR	Mirenda Daniele	MR	2026-07-27 15:00:00	2026-07-28 09:44:13.798921	\N	sa di fin, ha rottamazione del 2009, valuta gpl in generale	f	Presenza
39915002	36453_202607211000_MR	Chen Massimo	MR	2026-07-21 10:00:00	2026-07-27 09:29:35.743713	\N	YARIS CROSS TREND USATA (40.000 KM) 19.950€ sa che il prezzo è con finanziamento, interessato a finanziamento con anticipo di 7.000€.	f	Presenza
39914701	36228_202607141500_IS	Lusoli Matteo	IS	2026-07-14 15:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha auto da rendere auto del 2008 a metano, dr281de, valuta il finanziamento in base alla durata, vorrebbe farlo corto. L'auto è per il figlio neopatentato, sa già quanto costa senza fin e sa che la nostra è una buona offerta	f	Telefonico
44499365	36546_202607241700_BM	De Lucia Lorenzo	BM	2026-07-24 17:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento ( valutà metà antiocipo e metà finanziamento) HA una opel corsa del 2011 con 240.000km	f	Presenza
44499366	36550_202607241100_IS	CARRA PAOLO	IS	2026-07-24 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN CON ANTICIPO E HA UNA OPEL MOKKA DIESEL DEL 2016 KM 220000, sa che non è esposta e non la vuole bianca	f	Telefonico
44499368	36630_202607251000_SC	CASTELLI GIOVANNI	SC	2026-07-25 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Telefonico
44499374	36614_202607271000_RI	TRIMARCHI ROSARIO	RI	2026-07-27 10:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN, HA UNA GOLF 6 2011 KM200,000 DIESEL	f	Presenza
44499289	36568_202607231200_MR	Umberto Caterino	MR	2026-07-23 12:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, lui ha una kia sportage gt del 2019, valutata intorno ai 10000 euro su noicompriamoauto, ha chiesto se può anche dare anticipo di 5000 euro, sa anche quanto costa senza finanziamento	f	Telefonico
44499290	36569_202607231200_NV	CRASTA LORELLA	NV	2026-07-23 12:00:00	2026-07-29 15:31:01.471502	\N	PER C3 NERA USATA, SA DEL FINANZIAMENTO, VALUTA ANCHE ALTRO, CHIESTO DELLA CINGHIA A BAGNO D'OLIO, SA CHE DEVE AGGIUNGERE PASSAGGIO E INTERESSI	f	Telefonico
44499292	36571_202607231500_IS	Sahil Nath	IS	2026-07-23 15:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento	f	Telefonico
44499293	36573_202607231500_MR	Risi Vincenzo	MR	2026-07-23 15:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, lo valuta. HA una 500 del 2012           Amico di Mauro Fedi	f	Presenza
44499294	36575_202607231600_IS	Castellani Melissa	IS	2026-07-23 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, lo valutava	f	Telefonico
44499295	36576_202607231600_RI	Olivieri Nicoletta	RI	2026-07-23 16:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta, ha un usato una Opel Corsa del 2009 con 213.000 km	f	Telefonico
44499296	36580_202607231700_NV	SPOLSINO EUGENIO	NV	2026-07-23 17:00:00	2026-07-29 15:31:01.471502	\N	per sandero 9950€, vuole fin è per la figlia che ha un clio del 2003	f	Telefonico
44499297	36581_202607231700_GC	Arcucci Tommaso	GC	2026-07-23 17:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, non lo valuta. Però vorrebbe capire come funziona	f	Telefonico
44499298	36582_202607231800_IS	iacopo occupato	IS	2026-07-23 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
44499301	36376_202607231700_IS	Rossi Federico	IS	2026-07-23 17:00:00	2026-07-29 15:31:01.471502	\N	Sa di f0, ha alfa romeo del 2002 con spia motore acceso, interessato ad mg zs	f	Telefonico
44499309	36558_202607231000_NV	Pellissoni Alessandra	NV	2026-07-23 10:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con fin, sa che è l'ultima rimasta, ha da rendere una Yaris del 2008, valuta finanziamento.	f	Telefonico
39914703	36236_202607141600_NV	COCCO MARTINA	NV	2026-07-14 16:00:00	2026-07-29 15:31:01.471502	\N	PER YARIS CROSS TREND A 19950€, VUOLE FINANZIAMENTO	f	Telefonico
46668557	36700_202607281200_LL	Piccolo Giuseppe	LL	2026-07-28 12:00:00	2026-07-28 10:57:41.678385	\N	SA che il prezzo è con finanziamento, valuta quello classico. Ha una 208 del 2017 con 110.000km	f	Telefonico
39914706	36240_202607141700_MR	Giacopetti Stefano	MR	2026-07-14 17:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, vuole farlo su tutta la cifra. Non rende niente	f	Telefonico
46520442	36658_202607271200_MR	De Meo Giuseppe	MR	2026-07-27 12:00:00	2026-07-29 15:31:01.471502	\N	INTERESSATO ALLA DACIA SANDERE USATO FINTO A 9,950 (vedi link mandato per mail). Sa che il prezzo è con fin e lo valuta	f	Telefonico
46520443	36660_202607271600_MM	Budetta Chiara	MM	2026-07-27 16:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con fin e lo valuta, ha da rendere una Toyota aygo del 2010 circa 70 mila km.	f	Telefonico
46520444	36661_202607271500_BM	De Santis Clelia	BM	2026-07-27 15:00:00	2026-07-29 15:31:01.471502	\N	Per Arona. Sa che il prezzo è con finanziamento. Non sa ancora come funziona	f	Telefonico
46520445	36664_202607271600_AP	SEMERARO FLAVIO	AP	2026-07-27 16:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, sa prezzo cash di 23200€	f	Presenza
46520446	36663_202607271400_LL	Cosenza Leopoldo	LL	2026-07-27 14:00:00	2026-07-29 15:31:01.471502	\N	Sa del prezzo con fin e lo valuta. Ha un usato una Opel Mokka del 2021 con 64.000 km che vorrebbe dare come anticipo	f	Telefonico
39914757	36281_202607161600_GC	SIMION NICOLA	GC	2026-07-16 16:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE DARE TANTO ANTICIPO  E FINANZIARE UNA PICCOLAPARTE	f	Presenza
39914758	36288_202607161000_BM	CECCARINI FEDERICA	BM	2026-07-16 10:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA 500 DAL MECCANICO CON PROBLEMA AL MOTORE	f	Telefonico
39914759	36289_202607161400_LL	FIGAROLO DIEGO	LL	2026-07-16 14:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN	t	Presenza
46694987	36701_202607281100_MM	Dinucci Ilaria	MM	2026-07-28 11:00:00	2026-07-29 15:31:01.471502	\N	PER CAPTUR 2023 11950€, SA CHE è IN PREVENDITA E IL PREZZO è CON LA PREVENDITA, HA UNA  hiunday ix35 del 2012	f	Telefonico
46520479	36404_202607281800_MM	Iannazzo Jessica	MM	2026-07-28 18:00:00	2026-07-29 15:31:01.471502	\N	(usato finto, dacia sandero a 9.950€) sa che il prezzo è con finanziamento	f	Presenza
46678158	36698_202607281100_IS	Bertoni Luca	IS	2026-07-28 11:00:00	2026-07-28 11:06:18.124994	\N	Sa di fin, ha usato del 2011 opel corsa. Interessato anche a c10	f	Telefonico
39914710	36113_202607141700_SA	TASSINARI MATTEO	SA	2026-07-14 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VORREBBE DARE ANTICIPO E HA UNA GRANDE PUNTO DEL 2008, ARRIVA ALLE 17,15	f	Presenza
44499364	36533_202607241000_IS	Giannini Daniele	IS	2026-07-24 10:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, captur del 2013, è delle forze armate, sa che con noi non ha scontistica	f	Telefonico
46520428	36596_202607271700_AP	Massimo D'alfonso	AP	2026-07-27 17:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha punto del 2011 benzina, 289000 km	f	Presenza
44499378	36638_202607271600_BM	GIARRATANO ALBERTO	BM	2026-07-27 16:00:00	2026-07-29 15:31:01.471502	\N	PER OMODA 5 PREMIUM, SA DI F0, HA UNA SANDERO 2024 KM35,000 BENZINA CON UN ESTINZIONE DI 11500€ CIRCA DA FARE	f	Presenza
46520431	36644_202607271000_IS	Saminotti Davide	IS	2026-07-27 10:00:00	2026-07-29 15:31:01.471502	\N	sa che il prezzo è con fin e vuole dare anticipo di circa 5.000. Ha un usato una Swift del 2009 con 250.000 km.	f	Telefonico
46520436	36650_202607271100_MM	Capaccioni Luigi	MM	2026-07-27 11:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta, non ha usato	f	Telefonico
39915011	36467_202607211600_MM	Digregorio David	MM	2026-07-21 16:00:00	2026-07-27 09:29:35.743713	\N	sa di fin. Vuole dare metà di anticipo, ha08 del 2012, diesel, 110000 km	f	Telefonico
39914708	36245_202607141800_IS	Cerbo Alessio	IS	2026-07-14 18:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. Valutava. HA una dandero con maxi rata finale, vorrebbe cambiare con una duster. Interessato però sia a sandero sia a duster, dipende cosa gli conviene	f	Presenza
39914709	36031_202607140900_GC	Saltini Simone	GC	2026-07-14 09:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, ha una Mazda3, del 2011, diesel\r\nHa più di 400mila km	f	Presenza
39915114	36088_202607111000_MR	Capecchi Marco	MR	2026-07-11 10:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento	f	Presenza
39915115	36133_202607111200_MR	Poggi Marco	MR	2026-07-11 12:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, vuole dare 15k di anticipo, ha una ix20 del 2012 diesel 130cv km170000	f	Presenza
39914765	36304_202607161200_MR	PIGNATELLI COSIMO	MR	2026-07-16 12:00:00	2026-07-29 15:31:01.471502	\N	PER I10 USATA, SA PREZZO CASH DI 13950€	f	Telefonico
39914766	36311_202607161700_IS	CUROTTO ROSA	IS	2026-07-16 17:00:00	2026-07-29 15:31:01.471502	\N	PER CAPTUR NERA BENZINA USATA, SA DEL FIN MA VORREBBE SENZA, HA UNA CLIO DEL 2023 59000KM BENZ	f	Telefonico
39914767	36321_202607161500_IS	Cetti Andrea	IS	2026-07-16 15:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, ha da rendere una vettura da rottamare: polo del 2009, euro 4 con circa 70.000 km al momento ferma.	f	Presenza
39914768	35924_202607161500_MR	Farina Antonio	MR	2026-07-16 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39914769	36324_202607161600_LL	CAZZULANI LORENZO	LL	2026-07-16 16:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, NON HA USATO	f	Presenza
39914770	36325_202607161700_MR	Destro Riccardo	MR	2026-07-16 17:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, ha una Citroen c4 Cactus benzina del 2017	f	Telefonico
39914793	35812_202607031000_LL	Grigoli Sergio	LL	2026-07-03 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914794	35814_202607031500_BM	Arigoni Davide	BM	2026-07-03 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914795	35815_202607031700_SA	CRISTIANO ANTONIO	SA	2026-07-03 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914796	35816_202607031600_IS	Falcone Fabio	IS	2026-07-03 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914797	35823_202607031000_SA	Buriani Franco	SA	2026-07-03 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914798	35822_202607031000_MR	Pizzella Gaetano	MR	2026-07-03 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914799	35824_202607031100_RI	Scillone Davide	RI	2026-07-03 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915111	36060_202607111000_IS	Toborga Jose	IS	2026-07-11 10:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanzizman e lo valuta, ha usato una clio del 2018 con 150.000 km. Clio immatricolazione 2018 153000km	f	Presenza
39915113	36084_202607111200_IS	D'ambrosio Antony	IS	2026-07-11 12:00:00	2026-07-29 15:31:01.471502	\N	sa della f0, valuta fin e ha usato una Ford Fiesta del 2007. vorrebbe dare 5000/6000 euro d'anticipo	f	Presenza
46520448	36668_202607271500_MR	Melchiori Alessia	MR	2026-07-27 15:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha lancia y del 2006	f	Telefonico
46520449	36669_202607271700_MR	Bozzolini Simone	MR	2026-07-27 17:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. Lo vuole fare. Ha una mg hs del 2024 con 56.000 km	f	Presenza
46520450	36672_202607271600_MR	MORSELLI PAOLO	MR	2026-07-27 16:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VORREBBE DARE 5000€ DI ANTICIPO	f	Telefonico
46520451	36673_202607271600_LL	Gabrini Chiara	LL	2026-07-27 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, smart del 2011	f	Telefonico
46520457	36686_202607271700_MR	Sprazzi Alberto	MR	2026-07-27 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
44499382	36531_202607271800_MR	Brachi Roberto	MR	2026-07-27 18:00:00	2026-07-29 15:31:01.471502	\N	cupra formentor az	f	Presenza
39914800	35829_202607031000_IS	Bigni Marco	IS	2026-07-03 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915116	36134_202607111200_VL	Cangiamila Massimiliano	VL	2026-07-11 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. HA una BMW X1 xline del 2018 85.000 km. Valuta se dare anticipo ( dipende)	f	Presenza
39915117	36135_202607110900_MR	Massagli Lorenzo	MR	2026-07-11 09:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39914974	35571_202607211200_MR	David Mosè	MR	2026-07-21 12:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, valutava il finanziamento	f	Telefonico
44499973	36238_202607211700_AP	Lauci Emanuele	AP	2026-07-21 17:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, ha una Turan è del 2010 105cv 1900cm diesel da rendere. Interessato a finanziamento con anticipo di 5000€. Consulenza fatta da Massimiliano	f	Presenza
39914978	36274_202607211000_RI	Parise Eleonora	RI	2026-07-21 10:00:00	2026-07-29 15:31:01.471502	\N	CHIAMA ALLE 16 E 10. SA DI F0, HA UNA Toyota Yaris del 2015, ibrida cambio automatico, 140000 km\r\nPresenta lievi danni da grandine	f	Presenza
44499975	35949_202607211700_RI	Alessandro Taddei	RI	2026-07-21 17:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, non ha usato. Ha macchina aziendale, fa 20000 km/30000 km l'anno, vuole dare massimo anticipo possibile, potrebbe essere interessato a plug in	f	Presenza
39914983	36326_202607211000_AP	Russo Federica	AP	2026-07-21 10:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, non rende niente, vorrebbe dare 7000 euro di anticipo	f	Presenza
39914985	36355_202607211600_MR	Mattei Francesca Romana	MR	2026-07-21 16:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, interessato a finanziamento.	f	Presenza
44499989	36446_202607211500_RI	Bergomi Doriano	RI	2026-07-21 15:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, vorrebbe fare 4/5 anni di fin, sa che non la vede, 5000 euro di anticipo, rata sui 350. (FATTA CONSULENZA TELEFONICA CON BM)	f	Presenza
39915001	36449_202607211000_GC	Militello Maurizio	GC	2026-07-21 10:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha xtrail full hybrid, 3 anni con maxirata. Interessato anche alla jaecoo 5	f	Presenza
39915004	36457_202607211500_NV	Gemignani Matteo	NV	2026-07-21 15:00:00	2026-07-29 15:31:01.471502	\N	HA visto la i10 GPL , non valuta finanziamento	f	Presenza
46520447	36667_202607271700_MM	Marinelli Alberto	MM	2026-07-27 17:00:00	2026-07-29 15:31:01.471502	\N	sa che il prezzo è con fin e lo valuta. Ha un usato una Polo del 2020 con 135.000 km	f	Telefonico
46520476	36695_202607281500_IS	iacopo occupato	IS	2026-07-28 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914806	35838_202607031000_VL	Luca	VL	2026-07-03 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914807	35842_202607031700_RI	MORONI MYRIAM	RI	2026-07-03 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914808	35843_202607031700_MM	Della Nina Nicola	MM	2026-07-03 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914809	35844_202607031600_RI	MIGLIETTA LORENZO	RI	2026-07-03 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914810	35846_202607031700_AP	IZZO MARTINA	AP	2026-07-03 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914811	35847_202607031400_RI	Pece Alessandro	RI	2026-07-03 14:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914813	35854_202607031500_MR	CAMPATELLI ROSSANA	MR	2026-07-03 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914814	35856_202607031000_MR	Romano Fernando	MR	2026-07-03 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914816	35858_202607031100_VL	VIZZì FILIPPO	VL	2026-07-03 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914817	35860_202607031100_NO_VEND	\N	\N	2026-07-03 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914939	35914_202607061200_NV	Pintossi Cristina	NV	2026-07-06 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915013	35429_202607081000_NV	sara de maria	NV	2026-07-08 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39915014	35666_202607080900_MR	Erriu Giovanni	MR	2026-07-08 09:00:00	2026-07-29 15:31:01.471502	\N	olio freni	f	Presenza
39915024	35970_202607081100_AP	Lytvyn Ivan	AP	2026-07-08 11:00:00	2026-07-29 15:31:01.471502	\N	sa della f0, valuta fin, CLIENTE NON FINAZIABILE IN FORMULA ZERO, FATTA PROPOSTA DI USATO GIA' PRESENTE, CON VALENTINA, PANDA ANTICIPO 3000 RATA A 96 MESI 148	f	Presenza
39915025	35975_202607081700_BM	kledi Arkaxhiu	BM	2026-07-08 17:00:00	2026-07-29 15:31:01.471502	\N	sa della f0, valuta fin e non ha usato. Sa che la vettura non è esposta.	f	Presenza
39915026	35978_202607081400_SA	Giordani VITTORIO	SA	2026-07-08 14:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento	f	Presenza
39915032	35993_202607081100_NV	TRAVERSO ENRICO	NV	2026-07-08 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, SA PREZZO CASH DI 22500€ E HA UNA SMART ELETTRICA.	f	Telefonico
39915033	35994_202607081100_IS	GENTILIN IRENE	IS	2026-07-08 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN, SERVE PER NEOPATENTATO, HA UNA 208 DEL 2016 GPL 130,000KM	f	Telefonico
39915034	35996_202607081100_MM	Tinti Emanuele	MM	2026-07-08 11:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, vorrebbe dare anticipio 4000 euro e finanziare il resto, lui ha macchina del 2007, lui è un carrozziere	f	Telefonico
39915035	35998_202607081100_MR	Bandieri Robert	MR	2026-07-08 11:00:00	2026-07-29 15:31:01.471502	\N	Renault Captur\r\n90 CV EQUILIBRE GPL. SA che il prezzo è con finanziamento, non lo vuole fare	f	Telefonico
39915037	36003_202607081200_IS	BELLOMARE LUCA	IS	2026-07-08 12:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, è PER LA MADRE, VUOLE FIN, HA UNA ROTTAMAZIONE DI 30 ANNI	f	Telefonico
39915096	36094_202607101200_IS	IORIO SALVATORE	IS	2026-07-10 12:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA CLIO INCIDENTATA MA MARCIANTE	f	Telefonico
39915097	36095_202607101400_SA	Santonicola Giuseppe	SA	2026-07-10 14:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, non rende usato, interessato a dare molto anticipo perché non vorrebbe fare fin, ma ha detto che ascolta varie proposte. Gli serve macchina che consulma poco, valuta gpl in generale	f	Presenza
39915100	36099_202607101500_MR	Teresi Tania	MR	2026-07-10 15:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha clio del 2020, cerca macchina per neopatentati	f	Telefonico
39914803	35833_202607031600_MR	Rivero Laura	MR	2026-07-03 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914804	35834_202607031600_VL	Duci Giorgio	VL	2026-07-03 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914805	35835_202607031100_MR	Romano Fernando	MR	2026-07-03 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914815	35857_202607031500_VL	Licata Eliana	VL	2026-07-03 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914818	35861_202607031200_IS	Vulpio Giacomo	IS	2026-07-03 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914819	35862_202607031400_VL	Iurman Jessica	VL	2026-07-03 14:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
46520433	36645_202607271100_BM	Sposato Francesco	BM	2026-07-27 11:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, interessato a finanziamento, no usato. Se non risponde: numero moglie 3497456830.	f	Telefonico
46520437	36653_202607271200_IS	CANTONI GIULIA	IS	2026-07-27 12:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, SA PREZZO CAHS DI 20900€, VERREBBE DOMANI A MILANO IN CASO	f	Telefonico
39914760	36290_202607161100_IS	PUNTURO MAURO	IS	2026-07-16 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, ANTICIPO 4000€, GLI INTERESSA ANCHE LA J7, LA VUOLE BIANCA O NERA	f	Telefonico
39914761	36297_202607161400_RI	VIZITIU TICA	RI	2026-07-16 14:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN, è PER L'AZIENZA, NON HA USATO	f	Presenza
39914762	36300_202607161600_RI	Cernuschi Laura	RI	2026-07-16 16:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, vorrebbe dare 4000 euro di anticipo, sa che non la vede	f	Presenza
39914763	36301_202607161100_MR	BERTOLDI MAURIZIO	MR	2026-07-16 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, GLI INTERESSA PARTICOLARMENTE LA VALUTAZIONE DELLA SUA TCSON DEL 2020 40,000KM DIESEL è IN PENSIONE	f	Telefonico
39914764	36302_202607161500_RI	Carollo Mattia	RI	2026-07-16 15:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento.sa che non è obbligatorio rendere una vettura	f	Presenza
46520474	36692_202607281000_IS	Varano Erica	IS	2026-07-28 10:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, non lo valutava. SA che il prezzo bonifico è di 21.200€.	f	Telefonico
39914801	35830_202607031100_MM	Scimia Claudio	MM	2026-07-03 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
46636263	36699_202607281100_IS	Menti Rosalba	IS	2026-07-28 11:00:00	2026-07-28 10:40:53.218617	\N	Sa che il prezzo è con finanziamento, ha letto descrizione. HA una auris del 2008 con 170.000km	f	Telefonico
39914802	35832_202607031700_GC	Solonna Renzo	GC	2026-07-03 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
46520475	36694_202607281000_BM	FIGNANO DOMENICO	BM	2026-07-28 10:00:00	2026-07-28 10:41:54.123976	\N	SA DI F0, VUOLE DARE 10,000€ DI ANTICIPO, HA L'USATO DA VALUTARE	f	Telefonico
46520477	36696_202607281100_BM	Spingola Rachele	BM	2026-07-28 11:00:00	2026-07-28 11:06:18.124994	\N	SA che il prezzo è con finanziamento , lo valuta. HA una clio del 2015	f	Telefonico
39914835	36334_202607171600_AP	SACCO MARTINA	AP	2026-07-17 16:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA Y DEL 2013 KM 190,000GPL USATO DEVE IVIARMI FOTO NARRATO MAGARI 2000	f	Presenza
39914836	36335_202607171100_MR	Damiani Calogero	MR	2026-07-17 11:00:00	2026-07-29 15:31:01.471502	\N	Interessato alla Yaris Cross in pubblicità su Motornex a 20.990 SENZA INTERESSI (cartella drive promo fb). Chiedere a Francesco per dettgali sul preventivo. Ha un usato una Polo del 2015 con 128.000 km e valuta finanziamento.	f	Presenza
39914911	36450_202607201700_GC	REGANO DEBORAH	GC	2026-07-20 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, NON HA USATO	f	Telefonico
39914912	36452_202607201700_BM	Cassaniga Claudia	BM	2026-07-20 17:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha fiat panda del 2018, 100000 km,	f	Telefonico
39914936	35906_202607061100_IS	Giovale Riccardo	IS	2026-07-06 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914937	35908_202607061500_MR	Greco Massimo	MR	2026-07-06 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
46540742	36697_202607281600_IS	Allori Sarah	IS	2026-07-28 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, ha una Mazda mx 5 roadster fire del 2008	f	Telefonico
39914827	36294_202607170900_LL	Bistaffa Andrea	LL	2026-07-17 09:00:00	2026-07-29 15:31:01.471502	\N	Sa delprezzo con finanziamneto, sa prezzo bonifico di 28.000. Ha un usato una Opel Zafira del 2015 valutata 3.000 euro	f	Presenza
39914828	36296_202607171500_MR	RIMONDI LORENZO	MR	2026-07-17 15:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, GLI INTERESSA ANCHE LA PLUGIN, HA UNA BMW 525 TOURING 2014 300,000KM DIESEL	f	Presenza
39914829	36307_202607170900_AP	Iaquone Luca	AP	2026-07-17 09:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, ha una Peugeot 107 Active 1.0 del 2011, usato valutato 2500 e messo nel preventivo	f	Presenza
39914830	36309_202607171800_IS	Bastianelli Marco	IS	2026-07-17 18:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha o da restituire un usato 2015 Peugeot 308 Active ince3rto di comprere questa macchina offerta su ottobre colore a scelta	f	Presenza
39914831	36313_202607171000_AP	Giorgi Loris	AP	2026-07-17 10:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha panda del 2016 con bombole nuove, usato pagato 5000	f	Presenza
39914833	36120_202607171700_LL	Fin Jacopo	LL	2026-07-17 17:00:00	2026-07-29 15:31:01.471502	\N	sa della f0, valuta fin e sa che non è espsota. Ha un usato una A4 del 2019 con 115.000 km	f	Presenza
39914834	36185_202607171800_MM	Polidori Stefania	MM	2026-07-17 18:00:00	2026-07-29 15:31:01.471502	\N	REFERENZA DELLA NATASHA. Sa che è con finanziamento e lo vuole fare. ha un usato ma non sa se lo vuole far valutare una bmw. Ha visto la pubblicità fb a 16.980 ma il prezzo è aumentato a 19.980	f	Presenza
39914854	35871_202607041200_IS	Giusto Tomasino	IS	2026-07-04 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914855	35879_202607041200_NV	Nicolò Matteo	NV	2026-07-04 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914856	35885_202607041000_NV	lorenzo hautmann	NV	2026-07-04 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914857	35887_202607041200_MM	Gabriele Valentina	MM	2026-07-04 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914858	35889_202607041100_IS	andrea	IS	2026-07-04 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914938	35910_202607061100_MR	Calzolari Federico	MR	2026-07-06 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
44500074	36549_202607221700_IS	Merola Luigi	IS	2026-07-22 17:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento. Audi A1 del 2010 con 164.000km . Valuta il finanziamento	f	Telefonico
44500075	36553_202607221700_MM	Venuto Erika	MM	2026-07-22 17:00:00	2026-07-29 15:31:01.471502	\N	sa che il prezzo è con fin e lo valuta non ha usato	f	Telefonico
39914837	36336_202607171000_IS	PRAHL FRED	IS	2026-07-17 10:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA BMW 320 DEL 2009	f	Telefonico
39914843	36354_202607171600_LL	Samperi Giulia	LL	2026-07-17 16:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, interessata a finanziamento, ha visto l'Avenger ma è interessata eventualmente anche ad altre macchine.	f	Presenza
39914845	36362_202607171200_VL	Vitolo Raffaele	VL	2026-07-17 12:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha jeep avenger  2024 / 25.800 km	f	Telefonico
39914846	36366_202607171700_IS	Testini Maddalena	IS	2026-07-17 17:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, vorrebbe dare 4500 euro di anticipo e maxirata	f	Telefonico
39914847	36371_202607171600_IS	Giunta Vincenzo	IS	2026-07-17 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin,  350 euro di rata, interessata a grigio bicolor, ha yaris del 2006	f	Telefonico
39914848	36374_202607171700_MR	AMORE CARMINE	MR	2026-07-17 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE SENZA FIN	f	Telefonico
39914849	36375_202607171700_MM	Marzo Santino	MM	2026-07-17 17:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta. H aun usatp una golf del 2018 con 128.000 km	f	Telefonico
39914850	36376_202607171800_MR	Rossi Federico	MR	2026-07-17 18:00:00	2026-07-29 15:31:01.471502	\N	Sa di f0, ha alfa romeo del 2002 con spia motore acceso	f	Telefonico
39914851	35630_202607041100_VL	ALESSANDRA CONSUELO	VL	2026-07-04 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914852	35665_202607040900_MR	Fortunato Michele	MR	2026-07-04 09:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914853	35836_202607041000_MM	Bertini Gianmaria	MM	2026-07-04 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
44499355	36615_202607241700_SA	Corb Mariana Cosmina	SA	2026-07-24 17:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, una Audi A4 del 2019, sa che non la vede, vuole fare fin con maxirata	f	Presenza
44499356	36622_202607241600_BM	Palanghi Marzia	BM	2026-07-24 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, valutava il finanziamento	f	Telefonico
44499357	36624_202607241600_SA	Saporito Generoso	SA	2026-07-24 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, detto che non è obbligato a rendere vettura in permuta	f	Telefonico
44499358	36625_202607241600_MR	Tonelli Stefania	MR	2026-07-24 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
44499359	36626_202607241700_IS	Pasini Renato	IS	2026-07-24 17:00:00	2026-07-29 15:31:01.471502	\N	sa che il prezzo è con fin e lo vlauta, non ha usato	f	Telefonico
44499360	36627_202607241700_NV	Rossi Alice	NV	2026-07-24 17:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, è interessata, ha ford fiesta del 2006	f	Telefonico
39915027	35983_202607081200_SA	Genovesi Marco	SA	2026-07-08 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. HA una Up del 2015 con 130.000 km(DICE DI ESSERE INTERESSATO MA NON VUOLE COMPRARE SUBITO SENZA PENSARCI)	f	Presenza
39915028	35985_202607081500_SA	FORMAZIONE INSIDEA	SA	2026-07-08 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915029	35984_202607081000_MR	Zaniboni Alessandro	MR	2026-07-08 10:00:00	2026-07-29 15:31:01.471502	\N	sa del fin e lo valuta ha una rottamazione una opel corsa del 2003 con 240.000 km	f	Telefonico
39915030	35987_202607081000_BM	Alessi Carlo	BM	2026-07-08 10:00:00	2026-07-29 15:31:01.471502	\N	sa del finanziamento e lo valut5a ha un usato una 500l del 2020	f	Telefonico
39915031	35988_202607081600_BM	Caprini Lucio	BM	2026-07-08 16:00:00	2026-07-29 15:31:01.471502	\N	saa della f0, valuta finanizamento e ha usato, un renegade Anno 2016\r\nKm 240000. INTERESSATO ALLA YARIS CROSS ACTIVE	f	Presenza
39915098	36097_202607101200_SA	Jetmir Nehani	SA	2026-07-10 12:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA  suzuki S-Cross del 2014	f	Presenza
39914825	36220_202607171400_AP	Di Matteo Denise	AP	2026-07-17 14:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, Non valutava. SA però il prezzo bonifico e vuole capire come funziona	f	Presenza
39914826	36293_202607171100_GC	Mattedici Robert	GC	2026-07-17 11:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. SA che la vettura non è esposta	f	Presenza
39914832	36317_202607171200_IS	Fossato Michele	IS	2026-07-17 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento	f	Presenza
39914902	36434_202607201600_NV	Piacentini Valentina	NV	2026-07-20 16:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, vorrebbe dare anticipo di 6/7000€, gli serve per i primi di ottobre perché le scade il noleggio	f	Telefonico
39914903	36436_202607201600_GC	Xu Stefano	GC	2026-07-20 16:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, sa che non è esposta e che è l'ultima. Interessato a finanziamento.	f	Presenza
39914905	36438_202607201500_GC	GARGIULO ANNA	GC	2026-07-20 15:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0	f	Telefonico
39914906	36441_202607201800_MM	Buralli Nicola	MM	2026-07-20 18:00:00	2026-07-29 15:31:01.471502	\N	ha visto la longitude a benzina. Sa che il prezzo è con finanziamento e lo valuta, ha un usato una Golf del 2009 con 215.000 km	f	Presenza
39914907	36443_202607201700_MR	Ersego Luisa	MR	2026-07-20 17:00:00	2026-07-29 15:31:01.471502	\N	INTERESSATA ALLA DACIA SANDERO USATO FINTO A 9.980. VEDI COMAPGANE. Sa che il prezzo è con fiannziamento e lo valuta. Vuole dare anticipo	f	Telefonico
44499346	36594_202607241100_MM	Venturini enrico	MM	2026-07-24 11:00:00	2026-07-29 15:31:01.471502	\N	Dacia 300.000 km del 2010. Sa del prezzo con fin e lo valuta, vuole dare anticipo di 7.000 euro	f	Telefonico
44499348	36598_202607241500_IS	Perlazzini Fabio	IS	2026-07-24 15:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, non ha usato, valuta finanziamento, valuta anche MG ibrida.	f	Telefonico
44499349	36600_202607241100_BM	VALENTI RODOLFO	BM	2026-07-24 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN , MA HA VISTO IL TASSO ZERO CHE PROPONE KIA SUL NUOVO, HA UN Q5 DEL 2011 KM273000 DIESEL	f	Telefonico
44499351	36601_202607241100_RI	ZAMPOL TIZIANA	RI	2026-07-24 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0	f	Telefonico
39914886	36413_202607201100_IS	Pieri Edoardo	IS	2026-07-20 11:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, valuta un finanziamento lungo	f	Telefonico
39914887	36415_202607201100_MM	CARLEO IRENE	MM	2026-07-20 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914888	36414_202607201100_MR	IOZZINO GIUSEPPE	MR	2026-07-20 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0	f	Telefonico
39914889	36418_202607201200_MR	Gelli Roger	MR	2026-07-20 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914899	36429_202607201400_SA	bruno bololi	SA	2026-07-20 14:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39914900	36432_202607201500_BM	CRISTIANO VITTORIO	BM	2026-07-20 15:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA Nissan Juke 2012 immatricolata in Romania, SA CHE DEVE ESSERE ITALIANA	f	Telefonico
39914901	36433_202607201500_MM	Kaur Prabhdeep	MM	2026-07-20 15:00:00	2026-07-29 15:31:01.471502	\N	sa di f0	f	Telefonico
39914705	36239_202607141600_BM	PETROCCA GABRIELE	BM	2026-07-14 16:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA 208 DEL 2025 KM15000 BENZ CON ESTINZIONE DA FARE DI 12480€	f	Telefonico
44499343	36588_202607241100_MR	Masini Gabriele	MR	2026-07-24 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
44499344	36590_202607241000_MM	Romano Fabio	MM	2026-07-24 10:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, vuole fare finanziamento con vfg. Non rende usato	f	Telefonico
44500052	36453_202607221500_VL	Chen Massimo	VL	2026-07-22 15:00:00	2026-07-29 15:31:01.471502	\N	YARIS CROSS TREND USATA (40.000 KM) 19.950€ sa che il prezzo è con finanziamento, interessato a finanziamento con anticipo di 7.000€.	f	Presenza
39915012	36468_202607221600_GC	Montagner Sonia	GC	2026-07-22 16:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento, lo valuta e vuoel dare circa 1.500 come anticipo. Non ha usato	f	Presenza
44500054	36471_202607221600_LL	Fin Jacopo	LL	2026-07-22 16:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, e sa che non è esposta. Ha un usato: A4 del 2019 con 119.000 km	f	Presenza
44500055	36477_202607221600_MM	Boldrini Massimiliano	MM	2026-07-22 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, 300/350 al mese, rende suzuki splash, sa che è un acquisto che deve fare in breve termine. Ha visto anche la toyota yaris cross active km 0	f	Telefonico
44500056	36487_202607221700_BM	Lori Beatrice	BM	2026-07-22 17:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento, lo valuta e ha un usato una Fiat Croma del 2008 con 130.000 km	f	Presenza
44500064	36528_202607221200_VL	MICELI MAURO	VL	2026-07-22 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Telefonico
39914694	36209_202607141800_MM	Cordero Gilberto	MM	2026-07-14 18:00:00	2026-07-29 15:31:01.471502	\N	INTERESSATO ALLA VW T-ROC LIFE USATA A 16.9560. Sa che il prezzo è con finanziamento e lo valuta. Ha una mini del 2011. rende un usato una Una mini one del 2011	f	Presenza
39914696	36213_202607141100_MM	Petitto Gianpaolo	MM	2026-07-14 11:00:00	2026-07-29 15:31:01.471502	\N	appunatmento telefonico perché in quetso momento si trovano nelle marche. Sanno del fin e lo valutano. Hanno un usato una clio del 2022 con 40.000 che sta valutando se rendere o meno	f	Telefonico
39914697	36216_202607141200_IS	Nilgessi Enrico	IS	2026-07-14 12:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta. Ha un usato una Renault Captur intense start & stop 110 CV diesel 115000 km del 2017.	f	Telefonico
39914702	36229_202607141500_NV	Pacenti Francesca	NV	2026-07-14 15:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con Finanziamento, valuta un finanziamento con piccolo anticipo. HA una y di 16/17 anni con 192.000km	f	Telefonico
39914704	36238_202607141600_MM	Lauci Emanuele	MM	2026-07-14 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, ha una Turan è del 2010 105cv 1900cm diesel da rendere . Interessato a finanziamento con anticipo di 5000€	f	Telefonico
44499345	36593_202607241200_AP	Buccarella Lorenzo	AP	2026-07-24 12:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha Opel corsa del 2025, ed ho ancora quattro anni di finanziamento. Rende perché il motore è un tre cilindri e ci si trova male	f	Presenza
44499347	36596_202607241600_IS	Massimo D'alfonso	IS	2026-07-24 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha punto del 2011 benzina, 289000 km	f	Telefonico
46668543	36674_202607281100_LL	RANDAZZO ROBERTA	LL	2026-07-28 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, DEVE  rottamare un mezzo del 2008	f	Telefonico
44500057	36495_202607221500_AP	Doro Armando	AP	2026-07-22 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento, lo valuta e vorrebbe dare anticipo di 4.000 euro, FATTO PREVENTIVO SULLA MAX SENZA USATO NERA, NE PARLA CON LA MOGLIE	f	Presenza
44500058	36500_202607221100_NV	Buono Angela	NV	2026-07-22 11:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta, vorrebbe dare anticipo ma ancora non sa quanto da valutare. Ha un ustao una peugeot 208 del 2015 con 127.000 km	f	Presenza
44500059	36501_202607221700_RI	Montalvano eleonora	RI	2026-07-22 17:00:00	2026-07-29 15:31:01.471502	\N	SECONDO APP POST TELEFONICO, sa del prezzo con fin e lo valuta, ha un usato una Classe a del 2010 con 190.000 km	f	Presenza
44500060	36513_202607221200_AP	Franci Marcello	AP	2026-07-22 12:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, non rende usato. Viene per la compagna, lei può venire solo venerdì, DIRE CHE QUELLA SU SETTEMBRE è STATA VENDUTA E FERMIAMO QUELLA DI OTTOBRE	f	Presenza
44500061	36515_202607221500_BM	Caselli Marco	BM	2026-07-22 15:00:00	2026-07-29 15:31:01.471502	\N	Seat Arona Style. SA che il prezzo è con finanziamento, lo valuta. SA che la vettura è in prevendita.ci vuole 7 giorni per preparargliela	f	Presenza
44500062	36522_202607221100_IS	Battoli Carlo	IS	2026-07-22 11:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha ford kuga del 2016, 2,0 diesekl automatica, per il finanziamento ha detto che dipende dalla valutazione della sua auto, ha visto che su autoscout ha un prezzo di vendita 9/12k,	f	Telefonico
44500063	36526_202607221200_NV	PAPINI MATTEO	NV	2026-07-22 12:00:00	2026-07-29 15:31:01.471502	\N	sa di f0,  non vuole fin ,gli interessa hyrid o gpl, ora è in ferie e torna settimana prossima, kadjar 2020 116000diesel	f	Telefonico
44499350	36599_202607241500_RI	Aita Manuel	RI	2026-07-24 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo ocn fin e lo valuta con Si 2000 euro di anticipo max 36 rate. H apiù vetture da far valutare e vuole vedere cosa gli ocnviene di più	f	Telefonico
44499352	36604_202607241400_AP	Trimboli Cosimo	AP	2026-07-24 14:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, vuole dare anticipo di 5000 euro. Ha auto da rottamare	f	Presenza
44499353	36606_202607241500_BM	VALENZA MICHELE	BM	2026-07-24 15:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VORREBBE EVITARE IL FINANZIMENTO MA Può VALUTARE, HA UNA SEAT MII A METANO DI PIU DI 10 ANNI	f	Presenza
44499354	36621_202607241600_MM	Veneri Andrea	MM	2026-07-24 16:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, non rende usato	f	Telefonico
39915136	36157_202607131600_IS	OCCUPATO	IS	2026-07-13 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
44500065	36529_202607221200_MM	Aluotto Michele	MM	2026-07-22 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento , lo valutava	f	Telefonico
44500066	36530_202607221500_GC	Bruno Andrea	GC	2026-07-22 15:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha una rottamazione non marciante, non interessato a fin, detto che quelle pronta consegna sono state vendute	f	Telefonico
44500067	36534_202607221500_IS	CECCANO LUIGI	IS	2026-07-22 15:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE LA VENTILAZIONE DEI SEDILI, VUOLE FIN, VA A ROMA PER LAVORO E POTREBBE OGGI NEL TARDO POMERIGGIO, L'USATO NON SA SE RENDERLO	f	Telefonico
44500068	36536_202607221500_SA	Conzadori Giovanni	SA	2026-07-22 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo ocn finanizamento e lo valuta. Vorrebbe dare anticipo	f	Telefonico
44500069	36538_202607221500_NV	Domenico	NV	2026-07-22 15:00:00	2026-07-29 15:31:01.471502	\N	INTERESSATOA LLA DACIA DUSTER A 9,950 USATO FINTO. Sa che è con finanziamento e lo valuta	f	Telefonico
44500070	36539_202607221500_MM	Ferrari Andres	MM	2026-07-22 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta. Rende un usato una Una Fiat Panda del 2004 oppure una Volvo V 50 del 2010	f	Telefonico
44500071	36540_202607221600_IS	Ahamd Naeem	IS	2026-07-22 16:00:00	2026-07-29 15:31:01.471502	\N	SEAT IBIZA METANO 9.950€ sa che il prezzo è con finanziamento, non ha usato, vorrebbe dare anticipo, sa del prezzo bonifico.	f	Telefonico
44500072	36544_202607221600_MR	Dimario Onof	MR	2026-07-22 16:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta, non ha usato.	f	Telefonico
44500073	36545_202607221600_NV	Merlo Matteo	NV	2026-07-22 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, smart del 2015, benzina, 100000 km, marciante ma incidentata,	f	Telefonico
39915147	36179_202607131700_MR	Vinti Leonardo	MR	2026-07-13 17:00:00	2026-07-29 15:31:01.471502	\N	Ha visto laSeat Ibiza TGI . SA che il prezzo è con finanziamento	f	Telefonico
39915148	36183_202607131500_MR	Esposito Mocerino Nicola	MR	2026-07-13 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento e lo valuta. Ha una rottmazione una Una grande punto 1.3 Multijet anno 2006 con 267.000 km. Sta pensando se dare anticipo di 5.000 oppure zero anticipo	f	Telefonico
44500046	36254_202607221400_BM	DALL ACQUA ROBERTO	BM	2026-07-22 14:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOEL FIN, HA USATO MA NON SA SE VENDERLO DA SOLO O NO	f	Telefonico
44500047	35809_202607220900_AP	Giacchetta Danilo	AP	2026-07-22 09:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. SA che non ha obbligo di anticipo. Non ha vettura da rendere perché è intestata al nonno	f	Presenza
44500048	36351_202607221800_NV	Vasapollo Donatella	NV	2026-07-22 18:00:00	2026-07-29 15:31:01.471502	\N	per c3 nera usata e mg zs bianca usata	f	Presenza
44500049	36390_202607221000_IS	Piumento Massimiliano	IS	2026-07-22 10:00:00	2026-07-29 15:31:01.471502	\N	Valuta il finanziamento	f	Telefonico
39915036	36002_202607081100_VL	BUTTIGLIERI SALVATORE	VL	2026-07-08 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, Può ANCHE ANDARE IN SEDE A VERONA, HA UNA C2 DEL 2008	f	Telefonico
39915135	36156_202607131700_IS	Martelli Yuri	IS	2026-07-13 17:00:00	2026-07-29 15:31:01.471502	\N	Hanno visto prezzo 16,980. Sa di fin, 300 euro senza anticipo. Ha clio del 2018 1,5 diesel	f	Presenza
39915137	36158_202607131600_MR	OCCUPATO	MR	2026-07-13 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915138	36159_202607131600_MM	OCCUPATO	MM	2026-07-13 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915139	36160_202607131600_NV	OCCUPATA	NV	2026-07-13 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915140	36161_202607131600_BM	Baldacci Andrea	BM	2026-07-13 16:00:00	2026-07-29 15:31:01.471502	\N	Hanno visto prezzo 16,980. Sa di fin, vuole finanziare tutto, ha opel astra del 2019, ha chiesto se si può scontare passaggio	f	Presenza
39915141	36164_202607131800_IS	Macelli Debora	IS	2026-07-13 18:00:00	2026-07-29 15:31:01.471502	\N	Mercedes classe B 180 CDI anno 2008Non valuta il finanziamento	f	Presenza
39915142	36167_202607131200_MR	El sirri Sergio	MR	2026-07-13 12:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, vuole modello superiore,  ha un usato ma ha detto che vuole venderselo da solo	f	Telefonico
39915143	36168_202607131200_BM	Gaspare Bruno	BM	2026-07-13 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento . Lo valuta	f	Telefonico
39915144	36169_202607131400_BM	Tacconi Annelisa	BM	2026-07-13 14:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, lei l'avrebbe fatto a prescindere	f	Telefonico
39915145	36170_202607131500_IS	Gandolfo Maura	IS	2026-07-13 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento e lo valuta, ha un usato intestato a sua madre una Aygo del 2004 con circa 300.000 km	f	Telefonico
39915146	36171_202607131500_MM	Anastasia	MM	2026-07-13 15:00:00	2026-07-29 15:31:01.471502	\N	HA visto la ford fiesta. Sa che il prezzo è con finanziamento . SA che il prezzo è questo in prevendita	f	Telefonico
44499342	36572_202607241600_AP	Capozzoli Simone	AP	2026-07-24 16:00:00	2026-07-29 15:31:01.471502	\N	sa di f0	f	Presenza
39915108	36130_202607101800_MM	FRESCHI MASSIMO	MM	2026-07-10 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
44499991	36453_202607211700_VL	Chen Massimo	VL	2026-07-21 17:00:00	2026-07-29 15:31:01.471502	\N	YARIS CROSS TREND USATA (40.000 KM) 19.950€ sa che il prezzo è con finanziamento, interessato a finanziamento con anticipo di 7.000€.	f	Presenza
39915003	36455_202607211600_NV	Parlamenti Marco	NV	2026-07-21 16:00:00	2026-07-29 15:31:01.471502	\N	PER DACIA SANDERO A 9950€, SA DI F0, PROPOSTO F15, non ha usato	f	Presenza
39914913	35719_202607061600_LL	Meggiolaro Elena	LL	2026-07-06 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915006	36461_202607211000_IS	Bianchi Andrea	IS	2026-07-21 10:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento personalizzabile, valuta finanziamento.	f	Telefonico
39915008	36464_202607211500_SA	Amato Rosario	SA	2026-07-21 15:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, interessato a finanziamento, vuole finanziare tutta la cifra  ha da rendere una Y del 2007/2008 da rottamare.	f	Presenza
39915009	36463_202607211200_BM	Possamai Michel	BM	2026-07-21 12:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, vuole mettere vari pacchetti assicurativi, non rende usato. Fa ritardo di qualche minuto	f	Presenza
39915010	36465_202607211600_LL	Ballottin Stefano	LL	2026-07-21 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. Valuta il finanziamento	f	Presenza
44499998	36467_202607211100_GC	Digregorio David	GC	2026-07-21 11:00:00	2026-07-29 15:31:01.471502	\N	sa di fin. Vuole dare metà di anticipo, ha 208 del 2012, diesel, 110000 km	f	Telefonico
39914695	36210_202607141400_BM	Afflitto Salvatore	BM	2026-07-14 14:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con f0, valuta il finanziamento	f	Telefonico
39914715	36163_202607141600_IS	Nardini Tania	IS	2026-07-14 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, lo valuta	f	Presenza
39914716	36174_202607141500_LL	de cillis Angelo	LL	2026-07-14 15:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, bmw del 2013 328 gt,ha detto che lui vorrebbe  5000/6000 euro di valutazione, 147000 km, benzina	f	Presenza
39914717	36177_202607141800_NV	Prau Sabina	NV	2026-07-14 18:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento e lo valuta. Ha un usato una Jeep Cherokee del 2007 con 170.000 km	f	Presenza
39914718	36178_202607141600_MR	Biancalani Fabio	MR	2026-07-14 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
44499999	36470_202607211500_IS	Martinelli Daniele	IS	2026-07-21 15:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FINANZIARE 20K E NON HA USATO	f	Telefonico
44500000	36472_202607211100_IS	Zedditta Andrea	IS	2026-07-21 11:00:00	2026-07-29 15:31:01.471502	\N	INTERESSATO ALAL CAPTUR A 11.950 USATA. Sa che il prezzo è con fin e lo valuta. Ha un usato che vale meno di 4.000 euro, una c1 del 2005 con 145.000 km	f	Telefonico
44500001	36473_202607211500_BM	Marinello Samuele	BM	2026-07-21 15:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, ha una Opel corsa 1.3 cdti del 2011 con 170.000 km.	f	Telefonico
44500002	36474_202607211000_LL	Spina Angelo	LL	2026-07-21 10:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0	f	Telefonico
44500003	36477_202607211600_MM	Boldrini Massimiliano	MM	2026-07-21 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, 300/350 al mese, rende suzuki splash, sa che è un acquisto che deve fare in breve termine. Ha visto anche la toyota yaris cross active km 0	f	Telefonico
44500004	36478_202607211000_MR	Fattori Fabio	MR	2026-07-21 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
44500005	36479_202607211200_SC	santaroni LEONARDO	SC	2026-07-21 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
44500006	36486_202607211200_IS	Badr Sraidi	IS	2026-07-21 12:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, vuole fare durata 60 mesi e finanziare €8.000, non ha usato.	f	Telefonico
44500007	36489_202607211200_MM	Russo Angelo	MM	2026-07-21 12:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento. Lo valuta e h aun usato una C-max del 2009 con 380.000 km	f	Telefonico
39914711	36118_202607141600_LL	Frigerio Iacopo	LL	2026-07-14 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, non rende usato. Non interessato a finanziamento, detto che vediamo come fare	f	Presenza
39914712	36136_202607141600_GC	Pratillo Maria	GC	2026-07-14 16:00:00	2026-07-29 15:31:01.471502	\N	sa del prezz con fin e lo valuta, sa che non c'è esposizione e ha usato una lancia delta del 2009 con 263.000 km.	f	Presenza
39914713	36154_202607141000_SA	Piazzentini fabio	SA	2026-07-14 10:00:00	2026-07-29 15:31:01.471502	\N	sa della f0, valuta finanziamento e ha un usato una Ford focus del 2019 con 133.000 km	f	Presenza
39914714	36162_202607140900_SA	Miolo Jessica	SA	2026-07-14 09:00:00	2026-07-29 15:31:01.471502	\N	Sa della f0, valuta finanziamento. Sa che non è esposta e ha usato una Cubo del 2010 con 220.000 km	f	Presenza
44500011	36502_202607211600_BM	Fiesta Gabriele	BM	2026-07-21 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, non sa se lo valuta. Dipende cosa gli conviene	f	Telefonico
44500012	36507_202607211700_SA	Alvino Raffaela	SA	2026-07-21 17:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento  e lo valuta, ha un usato una Giulietta del 2009 non si ricordava i km	f	Telefonico
44500013	36512_202607211800_IS	Jozja Anna	IS	2026-07-21 18:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, rende aygo x del 2005. fa ritardo di 10 min, sa che non la vede, vuole fare fin	f	Presenza
39915118	36091_202607131800_MR	COPPOLA CATERINA	MR	2026-07-13 18:00:00	2026-07-29 15:31:01.471502	\N	TUA VECCHIA CLIENTE SA DI F0, VALUTA ANCHE LA JEEP AV BENZINA, VUOLE FIN, HA UNA UP DEL 2012 128000KM BENZ	f	Presenza
39915119	36101_202607131700_AP	BARANZOLI MAURIZIO	AP	2026-07-13 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN, HA USATO MA NON SA SE ROTTAMARE O NO	f	Presenza
39915120	36104_202607131100_MM	Maran Silvano	MM	2026-07-13 11:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, non rende usato	f	Telefonico
39915121	36107_202607131100_MR	Modaudo Antonino	MR	2026-07-13 11:00:00	2026-07-29 15:31:01.471502	\N	sa di f0	f	Telefonico
39915122	36124_202607130900_AP	SQUIDIERI GIUSEPPE	AP	2026-07-13 09:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA ROTTAMAZIONE	f	Presenza
39915123	36127_202607131000_MM	Rossetti Alessio	MM	2026-07-13 10:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, valuta varie opzioni, ha 500 o ecosport entrambe del 2017, non sanno quale rendere	f	Telefonico
39915124	36132_202607131800_NV	MINNITI ILARIA	NV	2026-07-13 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39914719	36182_202607141100_IS	Iozzelli Massimiliano	IS	2026-07-14 11:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamneto, lo valuta. Vorrebbe dare 3.000 d'anticipo e ha un usato una 500 l bianca con 230000 km del 2015	f	Presenza
39914720	36184_202607141400_LL	Cristao Davide	LL	2026-07-14 14:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fiannziamento, lo valuta. Vorrebe dare anticipo di 15.000 e ha una rottamazione una Suzuki S Cross Hybrid 2022 con 34.000 km	f	Presenza
39914721	36187_202607141700_BM	Bacciardi Edoardo	BM	2026-07-14 17:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, valuta solo se dopo non deve cambiare. Ha una yaris di 23 anni	f	Presenza
44500008	36491_202607211200_SA	Capuano Raffaele	SA	2026-07-21 12:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta, vorrebbe dare anticipo e 5 anni di finanziamento	f	Telefonico
44500009	36499_202607211700_NV	VALENTI FILIPPO	NV	2026-07-21 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FARE ANTICIPO, RATA DA 150€ E MAXI RATA, HA UNA AUDI A4 DEL 2003	f	Telefonico
44500010	36501_202607211600_GC	Montalvano eleonora	GC	2026-07-21 16:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta, ha un usato una Classe a del 2010 con 190.000 km	f	Telefonico
39915125	36137_202607131000_MR	Margarone Davide	MR	2026-07-13 10:00:00	2026-07-29 15:31:01.471502	\N	Da del prezzo con finanziamento, valuta la f15 e ha un usato una sa del seat ibiza fr 2017 con 170.000	f	Presenza
39915126	36140_202607131700_BM	Scutti Tommaso	BM	2026-07-13 17:00:00	2026-07-29 15:31:01.471502	\N	sa della f0, valuta fin e ha usato una grand voyager del 2008 con 200.000 km.	f	Presenza
39915127	36143_202607131000_BM	Pomina Francesca	BM	2026-07-13 10:00:00	2026-07-29 15:31:01.471502	\N	SA cfhe il prezzo è con finanziamento, lo valuta	f	Telefonico
39915128	36145_202607131700_SA	Berti Eleonora	SA	2026-07-13 17:00:00	2026-07-29 15:31:01.471502	\N	Sa del prezzo con finanziamento, sa prezzo bonifico ( 20.900) e ha una rottamazione una opel astra del 2006 non si ricorda i km.	f	Presenza
39915129	36147_202607131100_IS	Cosentino Ganmarco	IS	2026-07-13 11:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento e e lo valuta, ha un usato una Ford Fiesta del 2019 con 150.000 km	f	Telefonico
39915130	36148_202607131000_NV	benesperi riccardo	NV	2026-07-13 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39915131	36150_202607131200_IS	Benesperi Filippo	IS	2026-07-13 12:00:00	2026-07-29 15:31:01.471502	\N	vuole fare fin, ha polo del 2010  o tucson più recente (viene con la tucson), la moglie è più orientata all'ibrido, lui più al termico. È la moglie che vuole cambiare l'auto	f	Presenza
39915132	36151_202607131100_NV	Fardella Daniele	NV	2026-07-13 11:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento, lo valuta e non ha usato. Vorrebbe dare anticipo di 2/3.000 euro.	f	Telefonico
39915133	36153_202607131800_MM	Siena Rosaura	MM	2026-07-13 18:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, non ha usato, sa che non la vede, non interessata a finanziamento	f	Presenza
39915134	36155_202607131200_NV	Aureli Lorenzo	NV	2026-07-13 12:00:00	2026-07-29 15:31:01.471502	\N	sa della f0, valuta finanziamento e non vuole dare anticipo. Non ha usato.	f	Telefonico
39915086	36056_202607100900_LL	DE NEO ANGELO	LL	2026-07-10 09:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN, HA DUE ROTTAMAZIONI DI CUI UNA 500 DEL 2010	f	Presenza
39915109	36132_202607101700_VL	MINNITI ILARIA	VL	2026-07-10 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39914726	36217_202607151100_LL	Ardenghi eleonora	LL	2026-07-15 11:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha lancia y del 2016, valuta finanziamento, sa che non la vede	f	Presenza
39914727	36218_202607151600_RI	Formisano Arturo	RI	2026-07-15 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. SA che la vettura non è esposta ed è l'unica disponibile . Interessato anche alla omoda 5. ha due permute una c4 cactus del 2016 e una c3 picasso del 2016	f	Presenza
39914728	36227_202607151500_LL	OCCUPATA	LL	2026-07-15 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914729	36243_202607151000_RI	SALVIA CLAUDIO	RI	2026-07-15 10:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN, NON HA USATO, SA CHE NON è ESPOSTA. Ha fatto appuntamento con Iacopo telefonico	f	Presenza
39914722	36189_202607141000_NV	De Rosa Lorenzo	NV	2026-07-14 10:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. Rende una Pegout 2008 gt , tettuccio panoramico.\r\nDi luglio 2024.\r\n36mila km, est. 8000	f	Telefonico
39914723	36201_202607141500_MM	Abas Enzo	MM	2026-07-14 15:00:00	2026-07-29 15:31:01.471502	\N	Sa del prezzo ocn finanziamento e lo valuta. Ha una rottamazione un Mercedes del 92 con 400.000 km circa	f	Presenza
39914724	36202_202607141000_GC	Bacchei Francesca	GC	2026-07-14 10:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha fiat 500 L del 2017	f	Presenza
39914725	36203_202607141100_MR	Marchiori Teresa	MR	2026-07-14 11:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, vuole però pagamento bonifico	f	Presenza
39914730	36250_202607151600_MR	Trerè Michele	MR	2026-07-15 16:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, vuole fin e non ha usato	f	Presenza
39914731	36257_202607150900_MR	Lunardi Emiliano	MR	2026-07-15 09:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39914732	36258_202607151100_GC	Furlan Franco	GC	2026-07-15 11:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha qashqai del 2014, 230000 km, diesel	f	Presenza
39914733	36262_202607151500_RI	Manenti Massimiliano	RI	2026-07-15 15:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, sa che è l'ultima rimasta, valuta finanziamento e ha una permuta: Toyota Aygo 2006 con 101.000km	f	Presenza
39914734	36263_202607151700_IS	Nicoletta	IS	2026-07-15 17:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, juke del 2014 diesel acenta color nero da dare in permuta 159000 km gomme e interni nuovi, vuoel dare 5k di anticipo	f	Telefonico
39914735	36264_202607151100_NV	ROSSI MADDALENA	NV	2026-07-15 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE INTESTARLA ALL'AZIENDA, CHIAMARE QUESTO NUMERO 051530351 CHIEDERE DI MARY FOGLI	f	Telefonico
39914736	36265_202607151500_MM	Liati Giulia	MM	2026-07-15 15:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA Y ELEFANTINO DEL 2014 CON KM100,000	f	Telefonico
39914739	36268_202607151200_NV	Boi Antonio Angelo	NV	2026-07-15 12:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, ford ka 2016 km 102000 benz	f	Telefonico
39914740	36270_202607151800_MM	VITI LORIANO	MM	2026-07-15 18:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0	f	Presenza
39914741	36271_202607151700_GC	Bon Alessandro	GC	2026-07-15 17:00:00	2026-07-29 15:31:01.471502	\N	sa di f0	f	Presenza
39914742	36274_202607151600_NV	Parise Eleonora	NV	2026-07-15 16:00:00	2026-07-29 15:31:01.471502	\N	CHIAMA ALLE 16 E 10. SA DI F0, HA UNA Toyota Yaris del 2015, ibrida cambio automatico, 140000 km\r\nPresenta lievi danni da grandine	f	Telefonico
39914743	36275_202607151500_NV	Lepore Giacomo	NV	2026-07-15 15:00:00	2026-07-29 15:31:01.471502	\N	INTERESSATO A YARIS CROSS TREND USATA A 19.950€ Sa che il prezzo è con finanziamento, sa che il prezzo in promo è con prezzo in prevendita, non ha permuta.	f	Telefonico
39914753	36233_202607160900_GC	Fernando Nicolò	GC	2026-07-16 09:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha alfa romeo sw del 2011, 200000 km, è ferma per problema al cambio,	f	Presenza
39914754	36237_202607161700_NV	BARILLARRI IVO	NV	2026-07-16 17:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, INTERESSATO IN GENERALE AD UN SUV FULL HYBRID COME OMODA5 SPOSRATGE O T-ROC, HA UN T-ROC DIESEL DEL 2020 KM100,000	f	Presenza
39914755	36260_202607161700_GC	Levoratto Evan	GC	2026-07-16 17:00:00	2026-07-29 15:31:01.471502	\N	potrebbe arrivare con 10 min di ritardo sa di fin, interessato a quella macchina, ma può valutare altro. Ha a1 del 2021, benzina, preoccupato per la svalutazione futura dell'auto e perché gli serve più spaziosa	f	Presenza
39914756	36261_202607161200_NV	Diego Vuturo	NV	2026-07-16 12:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha rottamazione, interessato a prezzo più che all'auto in sé, sa che non la vede	f	Presenza
39914789	35794_202607031000_RI	Belleni Francesco	RI	2026-07-03 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914790	35803_202607031100_SA	STEFANI DAVIDE	SA	2026-07-03 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914791	35805_202607031000_GC	STABILIN THOMAS	GC	2026-07-03 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914792	35808_202607031100_GC	Perlini Matteo	GC	2026-07-03 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914771	36029_202607161500_MR	Scialabba Antonino Giovanni	MR	2026-07-16 15:00:00	2026-07-29 15:31:01.471502	\N	olio freni	f	Presenza
39914772	36328_202607161800_IS	Conti Cesare	IS	2026-07-16 18:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. HA una vettura da rottamare	f	Presenza
39914773	36146_202607161000_GC	Riffelli Riccardo	GC	2026-07-16 10:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha multipla a metano	f	Presenza
39914774	36180_202607161700_RI	Chemini Susanna	RI	2026-07-16 17:00:00	2026-07-29 15:31:01.471502	\N	sa della f0, valuta fin. Non Ha usato	f	Presenza
39914775	36186_202607161000_IS	Matera Aldo	IS	2026-07-16 10:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, non rendono niente	f	Presenza
39914776	35490_202607031600_GC	Lucchetta Paola	GC	2026-07-03 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914777	35633_202607031100_IS	Ignoti Cettina	IS	2026-07-03 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914778	35682_202607031400_AP	Bacci Pamela	AP	2026-07-03 14:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914779	35708_202607031700_IS	Andrei Mihai	IS	2026-07-03 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914780	35729_202607031700_BM	Morelli Maurizio	BM	2026-07-03 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914781	35733_202607031400_BM	Mallegni Antonio	BM	2026-07-03 14:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914782	35751_202607031700_MR	Stefanelli Enrico	MR	2026-07-03 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914783	35758_202607031600_BM	Stefanelli Enrico	BM	2026-07-03 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914784	35765_202607031000_MR	Marconato Davide	MR	2026-07-03 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914785	35766_202607031000_MM	Marconato Davide	MM	2026-07-03 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914786	35769_202607030900_LL	Lehaci Petru	LL	2026-07-03 09:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914787	35773_202607031200_SA	Carmelo Saglibene	SA	2026-07-03 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914788	35781_202607031700_MM	Bacci Laura	MM	2026-07-03 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914820	35872_202607031800_IS	FATTERUSSO ANTONIO	IS	2026-07-03 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914821	35875_202607031800_MR	Zanotti Mirca	MR	2026-07-03 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914822	35880_202607031800_MM	NASTRI NICOLA	MM	2026-07-03 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914823	36209_202607171600_MM	RAFANELLI ALICE	MM	2026-07-17 16:00:00	2026-07-29 15:31:01.471502	\N	INTERESSATO ALLA VW T-ROC LIFE USATA A 16.9560. Sa che il prezzo è con finanziamento e lo valuta. Ha una mini del 2011. rende un usato una Una mini one del 2011	f	Presenza
39914824	36215_202607171600_BM	Ferretti Jhonny	BM	2026-07-17 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, sa che la vettura non è esposta. Ha una panda del 2007	f	Presenza
39914838	36337_202607171500_IS	Comparini Cecilia	IS	2026-07-17 15:00:00	2026-07-29 15:31:01.471502	\N	auto per la figlia che sta a roma proposto formula smart light con manutenzione e fvg nel caso va fissato app su roma	f	Presenza
39914839	36340_202607171100_MM	Talia Vincenzo	MM	2026-07-17 11:00:00	2026-07-29 15:31:01.471502	\N	sa di f0,  proporre f15	f	Telefonico
39914840	36343_202607171000_BM	MACCARINI MASSIMILIANO	BM	2026-07-17 10:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, NON HA USATO	f	Telefonico
39914841	36348_202607171100_BM	Martiniello Salvatore	BM	2026-07-17 11:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, pensava ad un finanziamento a 48 mesi con rata finale valore futuro garantito ma valuta altre proposte.	f	Telefonico
39914842	36349_202607171100_VL	CALTAGIRONE ALESSIO	VL	2026-07-17 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, FA COMMERCIALISTA, VALUTA FIN, HA UNA MINI CLUBMAN DEL 2016 CON FRIZIONE NUOVA E CATENA DI DISTRIBUZIONE DA RIFARE	f	Telefonico
39914844	36359_202607171200_BM	Saccone Domenico	BM	2026-07-17 12:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento. HA una  opel zafira metano anno 2015 con 250000 km	f	Telefonico
39914859	35893_202607041200_MR	Uzuriaga Leonardo	MR	2026-07-04 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914860	23556_202607041200_VL	Rossomandi Lorenzo	VL	2026-07-04 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914861	33954_202607041000_MR	Puliti Giulia	MR	2026-07-04 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914862	36261_202607180900_NV	Diego Vuturo	NV	2026-07-18 09:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha rottamazione, interessato a prezzo più che all'auto in sé, sa che non la vede	f	Presenza
39914863	36081_202607181000_NV	Cenci Alessandro	NV	2026-07-18 10:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha clio del 2010, vorrebbe dare anticipo	f	Presenza
39914864	36351_202607181100_NV	Vasapollo Donatella	NV	2026-07-18 11:00:00	2026-07-29 15:31:01.471502	\N	per c3 nera usata e mg zs bianca usata	f	Presenza
39914865	36356_202607181100_MM	Quattrocchi Giacomo	MM	2026-07-18 11:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, minicooper d del 2012, vicino di casa della Cristina	f	Presenza
39914866	36373_202607181000_VL	Mira Ferrari	VL	2026-07-18 10:00:00	2026-07-29 15:31:01.471502	\N	indice 36332	f	Presenza
39914867	36387_202607181200_MM	Accioli Francesco	MM	2026-07-18 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, non vuole maxi rata	f	Presenza
39914868	36388_202607181100_VL	Bianchi Davide	VL	2026-07-18 11:00:00	2026-07-29 15:31:01.471502	\N	(tourneo) SA che il prezzo è con finanziamento, non sa ancora cosa valuta.	f	Presenza
39914869	36391_202607181200_NV	Chiostrini Roberta	NV	2026-07-18 12:00:00	2026-07-29 15:31:01.471502	\N	Valuta il finanziamento e ha una rottamazione.Sa che la vettura non è esposta	f	Presenza
39914870	36394_202607181100_MM	CARUSO PAOLA	MM	2026-07-18 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914871	36400_202607181200_VL	PERONE MARIA ROSARIA	VL	2026-07-18 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914872	36299_202607201000_RI	Tamagni Claudia	RI	2026-07-20 10:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, valutava il finanziamento	f	Telefonico
39914873	35857_202607201200_VL	Licata Eliana	VL	2026-07-20 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914874	36327_202607201500_RI	De Lucia Gianluca	RI	2026-07-20 15:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha scenic del 2019, 130000 km, sa che non la vede	f	Presenza
39914875	36335_202607201000_MR	Mugnanini Anna Maria	MR	2026-07-20 10:00:00	2026-07-29 15:31:01.471502	\N	Interessato alla Yaris Cross in pubblicità su Motornex a 20.990 SENZA INTERESSI (cartella drive promo fb). Chiedere a Francesco per dettgali sul preventivo. Ha un usato una Polo del 2015 con 128.000 km e valuta finanziamento.	f	Presenza
39914876	36364_202607201000_NV	Bindini Tania	NV	2026-07-20 10:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, interessata a finanziamento, valuta anche la MG usata Luxury, non ha usato da rendere.	f	Presenza
39914877	36377_202607201800_MR	Baldi Paolo	MR	2026-07-20 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39914883	36404_202607201600_BM	Iannazzo Jessica	BM	2026-07-20 16:00:00	2026-07-29 15:31:01.471502	\N	(usato finto, dacia sandero a 9.950€) sa che il prezzo è con finanziamento	f	Presenza
39914884	36410_202607201100_GC	De Luca Antonio	GC	2026-07-20 11:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, lo valutava ( valutava un piccolo finanziamento) ha una t-cross del 2020 con 80.000km	f	Telefonico
39914885	36411_202607201100_NV	Bassano Enrica	NV	2026-07-20 11:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, non lo valutava . Però vorrebbe capire come funziona	f	Telefonico
39914878	36389_202607201500_LL	Mina Beatris	LL	2026-07-20 15:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, lo valuta	f	Presenza
39914879	36393_202607201600_MM	Matti Giampiero	MM	2026-07-20 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, lo valuta	f	Presenza
39914880	36399_202607201700_LL	Ebborino Teresa	LL	2026-07-20 17:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento. Non ha vettura da rendere	f	Presenza
39914881	36402_202607201000_IS	Alpi denis	IS	2026-07-20 10:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha usato da demolire. Sa che quello è prezzo di prevendita, quando arriva costa +4000 euro	f	Telefonico
39914882	36403_202607201000_MM	Camangi Chiara	MM	2026-07-20 10:00:00	2026-07-29 15:31:01.471502	\N	Interessata alla Kia Stonic usata. Sa dl prezzo con fin e lo valuta. Ha un usato una Peugeot 2008 con 100.000 km del 2014.	f	Telefonico
39914914	35848_202607060900_AP	Carlo Aceti	AP	2026-07-06 09:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914915	35849_202607061200_BM	CABIATI FRANCO	BM	2026-07-06 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914916	35859_202607061000_AP	Dal Prato Giorgia	AP	2026-07-06 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914917	35863_202607061000_BM	Tiberio Biliotti	BM	2026-07-06 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914918	35864_202607061000_NV	Crystian Marcineiro Dos Santos.	NV	2026-07-06 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914919	35865_202607061500_SA	SANTOSELLI MATTEO	SA	2026-07-06 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914920	35870_202607061600_MR	GURIOLI ALESSANDRO	MR	2026-07-06 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914921	35877_202607061100_LL	Negro Raffaella	LL	2026-07-06 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914922	35878_202607061600_SA	Celano Mattia	SA	2026-07-06 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914923	35881_202607061500_AP	Mirko	AP	2026-07-06 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914924	35882_202607061700_AP	Passone Edardo	AP	2026-07-06 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914925	35883_202607061800_NV	Salmaso Claudia	NV	2026-07-06 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914926	35884_202607061500_LL	Jennifer Goeloe	LL	2026-07-06 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914927	35886_202607061500_VL	Angioli Carlo	VL	2026-07-06 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914928	35888_202607061100_AP	Fidale michela	AP	2026-07-06 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914929	35892_202607061700_LL	Stradiotto stefano	LL	2026-07-06 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914930	35894_202607061000_MM	Camellini Giovanni	MM	2026-07-06 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914931	35895_202607061800_MM	Oliveri Pamela	MM	2026-07-06 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914932	35898_202607061700_NV	Messina Giuseppe	NV	2026-07-06 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914933	35899_202607061400_VL	Cagiula Narcisa	VL	2026-07-06 14:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914934	35904_202607061100_MM	Allegritti Matteo	MM	2026-07-06 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914935	35905_202607061200_IS	Di Battisti Camilla	IS	2026-07-06 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914962	35925_202607071700_SA	\N	SA	2026-07-07 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914940	35916_202607061400_SA	Venturi Orazio	SA	2026-07-06 14:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914941	35917_202607061200_VL	Sanna Renzo	VL	2026-07-06 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914942	35918_202607061500_MM	Bini Simone	MM	2026-07-06 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914943	35919_202607061500_NV	ienco Roberto	NV	2026-07-06 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914944	35927_202607061600_MM	Cremon Ivano	MM	2026-07-06 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914945	35928_202607061500_MR	Menichini Monia	MR	2026-07-06 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914946	35929_202607061600_NV	CENCETTI ELENA	NV	2026-07-06 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914947	35930_202607061600_BM	Franzoso Giada	BM	2026-07-06 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914948	35932_202607061700_BM	Dipalma Donato	BM	2026-07-06 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914949	35933_202607061700_VL	Maraboli Sergio	VL	2026-07-06 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914950	35934_202607061700_MM	Pozza Waeil	MM	2026-07-06 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914951	34475_202607061800_MR	Massimo occupato	MR	2026-07-06 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914952	35845_202607071000_NV	INNOCENTI ELEONORA	NV	2026-07-07 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914953	35855_202607071100_LL	Provana Antonio	LL	2026-07-07 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914954	35890_202607071800_IS	Rivi Yuri	IS	2026-07-07 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914955	35891_202607071700_AP	Giuseppe Grazioso	AP	2026-07-07 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914956	35897_202607071700_LL	Barboglio Monica	LL	2026-07-07 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914957	35903_202607071200_IS	Scarpelli Mario	IS	2026-07-07 12:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914958	35909_202607071700_AP	Turchi Riccardo	AP	2026-07-07 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914959	35915_202607071100_SA	Ferraresi gianluigi	SA	2026-07-07 11:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914960	35922_202607070900_AP	Marotta Aldo	AP	2026-07-07 09:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914961	35923_202607071500_LL	Onofri Sebastiano	LL	2026-07-07 15:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914977	36247_202607231600_MR	Calzolai Luigi	MR	2026-07-23 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39914979	36276_202607231600_AP	Alessia occupata	AP	2026-07-23 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914980	36031_202607271000_GC	Saltini Simone	GC	2026-07-27 10:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, ha una Mazda3, del 2011, diesel\r\nHa più di 400mila km	f	Presenza
39914982	34002_202608021400_MR	Massimo Prova	MR	2026-08-02 14:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39914963	35926_202607071700_SA	Consegna Zanni	SA	2026-07-07 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914964	35931_202607070900_IS	Babich Edi	IS	2026-07-07 09:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914965	35935_202607071600_LL	Zhang Christian	LL	2026-07-07 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914975	36238_202607211600_AP	Lauci Emanuele	AP	2026-07-21 16:00:00	2026-07-27 09:29:35.743713	\N	SA che il prezzo è con finanziamento, ha una Turan è del 2010 105cv 1900cm diesel da rendere. Interessato a finanziamento con anticipo di 5000€. Consulenza fatta da Massimiliano	f	Presenza
39914981	140_202607221500_MR	Seminara Angelo	MR	2026-07-22 15:00:00	2026-07-27 09:29:35.743713	\N	\N	f	\N
39914966	35936_202607071000_MM	Sabatini Maria Adele	MM	2026-07-07 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914967	35937_202607071000_IS	Rizzuti Federico	IS	2026-07-07 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914984	36350_202607211700_AP	Pitella Alexander	AP	2026-07-21 17:00:00	2026-07-27 09:29:35.743713	\N	SA che il prezzo è con finanziamento, valuta. Vorrebbe dare anticipo di 5000€	f	Presenza
39914968	35939_202607071000_VL	Guarini Antonio	VL	2026-07-07 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914969	35940_202607071000_SA	Mirko Rapini	SA	2026-07-07 10:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914970	35941_202607071600_SA	Mantuano Salvatore	SA	2026-07-07 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914971	35943_202607071800_MM	Guarini Filippo	MM	2026-07-07 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914972	35944_202607071700_LL	Cristian Azzolina	LL	2026-07-07 17:00:00	2026-07-29 15:31:01.471502	\N	\N	t	\N
39914973	36215_202607211400_BM	Ferretti Jhonny	BM	2026-07-21 14:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, sa che la vettura non è esposta. Ha una panda del 2007 (SECONDO APPUNTAMENTO)	f	Presenza
39914976	36242_202607221500_MR	Seminara Angelo	MR	2026-07-22 15:00:00	2026-07-29 15:31:01.471502	\N	olio freni	f	Presenza
39914986	36363_202607211100_AP	Sciarrillo  Alessandro	AP	2026-07-21 11:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, non rende niente, non molto interessato a fin	f	Presenza
39914987	36370_202607210900_AP	INNANTUONO PASQUALE	AP	2026-07-21 09:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, USATO NON VALUTATO è VENUTO IL PADRE	f	Presenza
39914988	36380_202607211200_AP	Maggiora Vergano Giovanni	AP	2026-07-21 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. Ha una 500 del 2009 con 157.000 km	f	Presenza
39914989	36390_202607211700_LL	Piumento Massimiliano	LL	2026-07-21 17:00:00	2026-07-27 09:29:35.743713	\N	Valuta il finanziamento	f	Presenza
39914990	36393_202607211000_MM	MEUCCI GABRI	MM	2026-07-21 10:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, lo valuta	f	Presenza
39914991	36401_202607211500_AP	Blonna Alessio	AP	2026-07-21 15:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento.valuta il finanziamento, HA ROTTAMAZIONE	f	Presenza
39914992	36408_202607211400_SA	Stecchetti Federico	SA	2026-07-21 14:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con Finanziamento, sa che è l'unica disponibile. Ha una renegade (valutata 4000€ da noicompriamoauto). Vuole finanziare il meno possibile	f	Presenza
39914994	36416_202607211700_BM	Panicucci Ludovica	BM	2026-07-21 17:00:00	2026-07-29 15:31:01.471502	\N	Sa del prezzo con finanziamento e lo valuta, non ha usato	f	Presenza
39914995	36435_202607211500_GC	Scatamburlo Veronica	GC	2026-07-21 15:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, captur techno del 2025, sa che non la vede, ha detto che può vendersela anche da sola, la vende perché è troppo piccola	f	Presenza
39914997	36440_202607211600_SA	OCCUPATA	SA	2026-07-21 16:00:00	2026-07-29 15:31:01.471502	\N	\N	f	\N
39914998	36442_202607211500_MM	Morelli Roberto	MM	2026-07-21 15:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento. HA una classe a del 2016 con 145.000km . Vorrebbe pagare la parte restante bonifico	f	Presenza
39914999	36445_202607211600_IS	Mourad zahir	IS	2026-07-21 16:00:00	2026-07-29 15:31:01.471502	\N	Valuta il finanziamento. Ha visto la T-roc usata che è stata venduta. Senti la Valentina prima sell'appuntamento	f	Presenza
39914993	36206_202607221800_MR	Silveri Adriano	MR	2026-07-22 18:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39914996	36439_202607221100_MR	Barbera Maria	MR	2026-07-22 11:00:00	2026-07-29 15:31:01.471502	\N	Non sa ancora con cosa cambiare. Valuta sempre finanziamento. Aveva acquistato una sportage nel 2024 con Francesco	f	Presenza
39915000	36446_202607211100_RI	Bergomi Doriano	RI	2026-07-21 11:00:00	2026-07-27 09:29:35.743713	\N	Sa di fin, vorrebbe fare 4/5 anni di fin, sa che non la vede, 5000 euro di anticipo, rata sui 350.	f	Presenza
39915019	35946_202607081800_IS	Lugano Lorenzo	IS	2026-07-08 18:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha giulietta di 7 anni	f	Presenza
39915039	36005_202607081500_NV	Medori Giuseppe	NV	2026-07-08 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento e lo valuta. Ha una rottamazione una punto di 14 anni fa con 120.000 km	f	Telefonico
39915040	36006_202607081200_NV	Bessone Luca	NV	2026-07-08 12:00:00	2026-07-29 15:31:01.471502	\N	SA ched il prezzo è con finanziamento . Valutava il finanziamento . Ha una rottamazione	f	Telefonico
39915041	36007_202607081200_BM	Ferrari Riccardo	BM	2026-07-08 12:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento. Non vuole dare anticipo.	f	Telefonico
39915042	36008_202607081500_IS	Danieli Gianluca	IS	2026-07-08 15:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha kia sportage del 2016, tdi 1,7,	f	Telefonico
39915043	36009_202607081400_BM	Giacomelli Andrea	BM	2026-07-08 14:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con Finanziamento, valutava finanziamento	f	Telefonico
39915056	36031_202607091000_IS	Saltini Simone	IS	2026-07-09 10:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, ha una Mazda3, del 2011, diesel\r\nHa più di 400mila km	f	Telefonico
39915057	36030_202607091100_IS	Tiziana Susini	IS	2026-07-09 11:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, vorrebbe dare 1000 euro di anticipo, lei è in pensione, ha 51 anni. Vuole contestare con figlia	f	Presenza
39915044	36025_202607081600_MR	PUZIO VALENTINA	MR	2026-07-08 16:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN, HA UNA 500 DEL 2022 KM90,000 BENZ	f	Telefonico
39915045	36026_202607081700_MM	Soni Monic	MM	2026-07-08 17:00:00	2026-07-29 15:31:01.471502	\N	Al momenti si trova in vancanza, sa che il prezzo è con finanziamento e lo valuta. Non ha usato da rendere	f	Telefonico
39915046	36027_202607081700_NV	Sano Luljeta	NV	2026-07-08 17:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, vuole rata da 300/350€ e finanziare solo 7000 €	f	Telefonico
39915047	35898_202607091000_NV	Messina Giuseppe	NV	2026-07-09 10:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento	f	Presenza
39915048	35900_202607090900_MR	Cardamone Giuseppe	MR	2026-07-09 09:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39915049	35942_202607091600_MR	kulla Antoneta	MR	2026-07-09 16:00:00	2026-07-29 15:31:01.471502	\N	sa della f0, valuta fin totale senza anticipo e ha un usato una ford smax del 2010 con 280.000 km	f	Presenza
39915050	35979_202607091000_LL	Stucchi Mattia	LL	2026-07-09 10:00:00	2026-07-29 15:31:01.471502	\N	sa di f0	f	Presenza
39915051	35982_202607091100_AP	CERCOLA LUCA	AP	2026-07-09 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VORREBBE DARE 10K DI ANTICIPO,  HA UNA I20 DEL 2015 KM150,000 BENZINA	f	Presenza
39915052	36010_202607091400_LL	D'Aleo Giuseppe	LL	2026-07-09 14:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha permuta 208 del 2016	f	Presenza
39915053	36011_202607091700_SA	Macrì  Roberto	SA	2026-07-09 17:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, vuole dare 8000/9000 euro di anticipo, potrebbe arrivare con 10 min di ritardo	f	Presenza
39915054	36014_202607091600_LL	Nava Riccardo	LL	2026-07-09 16:00:00	2026-07-29 15:31:01.471502	\N	Sa di f0, non ha usato, sa che con fin il prezzo rimae il solito	f	Presenza
39915055	36015_202607090900_AP	Nicolaescu Lucia	AP	2026-07-09 09:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, vuole dare grande anticipo, ha lancia y del 2011, 170000 km, SIGNORA ALTERATA VOLEVA FARE FIN PER CIRCA 3000 EURO MASSIMO E DARE 10 CONTANTI….SCRITTA FORMULA ZERO	f	Presenza
39915069	36058_202607091500_NV	Paolasini Viviana	NV	2026-07-09 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento e lo valura. CHIAMARE POSISBILMENTE DALLE 15:15, rende punto 206000km	f	Telefonico
39915070	36062_202607091600_IS	Fornasiero Anita	IS	2026-07-09 16:00:00	2026-07-29 15:31:01.471502	\N	sa del finanzamento e lo valuta. Vorrebbe dare 5.000 euro d'anticipo	f	Telefonico
39915071	36063_202607091700_LL	Sirianni  Maurizio	LL	2026-07-09 17:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, vorrebbe senza anticipo	f	Presenza
39915058	36032_202607091000_VL	Dil Tahir Sher	VL	2026-07-09 10:00:00	2026-07-29 15:31:01.471502	\N	per t-roc usata, sa di finanziamento e vuole farlo	f	Telefonico
39915059	36034_202607091000_MR	PRANDO NICOLA	MR	2026-07-09 10:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA PANDA DEL 2021 KM53000 GPL CHE VUOLE USARE COME ANTICIPO	f	Telefonico
39915060	36038_202607091100_NV	MAMMUCCARI DANIELE	NV	2026-07-09 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, DEVE FARE FIN, SA CHE DEVE AGGIUNGERE PASSAGGIO E INTEERSSI, VUOLE SAPERE PREZZO FINITO TOTALE	f	Telefonico
39915061	36039_202607091600_BM	BOCCACCE FABRIZIO	BM	2026-07-09 16:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN E HA UNA YARIS DEL 2012	f	Presenza
39915062	36040_202607091100_BM	Agreste Francoise	BM	2026-07-09 11:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, vorrebbe però dare anticipo di 10.000e. Non ha usato da rendere	f	Telefonico
39915063	36041_202607091100_MR	PETRUCCI BARBARA	MR	2026-07-09 11:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA VETTURA DA ROTTAMARE ROTTA	f	Presenza
39915064	36043_202607091600_SA	Meloni Simone	SA	2026-07-09 16:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha 207da rottamare che è a cagliari(cliente non iteressato a formula zero, suo fratello lavora in una finanziaria e voleva solo l'auto a quel prezzo. Auto per sua mamma)	f	Presenza
39915065	36049_202607091200_NV	BARCELLA SARA	NV	2026-07-09 12:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, SA PREZZO CASH DI 21200€ VORREBBE DARE PIU ANTICIPO POSSIBILE	f	Telefonico
39915066	36050_202607091500_LL	Bonora Alice	LL	2026-07-09 15:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento, valuta il finanziamento	f	Presenza
39915067	36051_202607091200_BM	De Milato Carlo	BM	2026-07-09 12:00:00	2026-07-29 15:31:01.471502	\N	Sa di fin, ha Peugeot 207 sw del 2013 con 260000 km	f	Presenza
39915068	36053_202607091200_MR	RISERI LUCREZIA	MR	2026-07-09 12:00:00	2026-07-29 15:31:01.471502	\N	SA DO F0, VUOLE FIN, PRIMA AUTO, NON HA USATO	f	Telefonico
39915072	36067_202607091600_NV	USIGNOLO STEFANIA	NV	2026-07-09 16:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN, è DIPENDENTE PUBBLICO, VUOLE DARE ANTICIPO DI 8000€ NON HA USATO	f	Telefonico
39915073	36068_202607091600_VL	DELISANTI SIMONA	VL	2026-07-09 16:00:00	2026-07-29 15:31:01.471502	\N	PER CAPTUR USATA DEL 2023 BENZINA, SA DI FINANZIMENTO	f	Telefonico
39915074	36069_202607091700_MR	Micheli Alessandro	MR	2026-07-09 17:00:00	2026-07-29 15:31:01.471502	\N	\N	f	Presenza
39915075	36070_202607091800_NV	NEROZZI GIACOMO	NV	2026-07-09 18:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA FIESTA TITANIUM 1,4 GPL DEL 2016 KM 250,000	f	Presenza
39915076	36075_202607091700_IS	skalli Salah	IS	2026-07-09 17:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha kia proceed gt del 2019 con fin dsopra, gli rimane da estinguere sui 17000 euro, rata sui 350	f	Telefonico
39915077	36079_202607091800_IS	LEVORIN NICOLA	IS	2026-07-09 18:00:00	2026-07-29 15:31:01.471502	\N	sa di f0, sa prezzo cahs di 27500e, fa finanzimento solo per lo sconto, vuole un hybrid e cmabio automatico	f	Telefonico
39915078	36080_202607091700_VL	Sforzi Alessandro	VL	2026-07-09 17:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con Finanziamento, vuole maxi rata	f	Telefonico
39915079	0_NO_DATE_NO_VEND	415	\N	\N	2026-07-29 15:31:01.471502	\N	\N	f	\N
39915080	36018_202607101600_AP	Monaco Maddalena	AP	2026-07-10 16:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. Sa che il ritiro usato non è obbligatorio.	f	Presenza
39915081	36023_202607101000_AP	PRECIUTTI IRENE	AP	2026-07-10 10:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento	f	Presenza
39915082	36028_202607101700_AP	Capursi Gianfranco	AP	2026-07-10 17:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento,ha una Skoda Fabia del 2008 con impianto gpl	f	Presenza
39915083	36033_202607101500_AP	Consegna Pulvirenti Chiara	AP	2026-07-10 15:00:00	2026-07-29 15:31:01.471502	\N	yaris 439764	f	\N
39915084	36035_202607101400_AP	DE SANTIS ANDREA	AP	2026-07-10 14:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, HA UNA 208 DEL 2015 DIESEL, USATO NON VALUTATO	f	Presenza
39915085	36042_202607101500_LL	MEDINA EDWIN	LL	2026-07-10 15:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN, HA UNA PANDA DEL 2008	f	Presenza
39915089	36082_202607101000_IS	Rizzato Francesco	IS	2026-07-10 10:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, ha rottamazione	f	Telefonico
39914746	35959_202607151700_RI	STRABELLO MICHELA GLORIA	RI	2026-07-15 17:00:00	2026-07-29 15:31:01.471502	\N	GLORIA MICHELA STRABELLO Sa che il prezzo è con finanziamento, avrebbe una rottamazione ma è intestata a una persona non facente parte del nucleo familiare, valuta diverse soluzioni. Interessato anche a Omoda.	f	Presenza
39914748	36175_202607151100_IS	Bologna Sabrina	IS	2026-07-15 11:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo ocn fin e lo valuta non ha usato da rendere.	f	Telefonico
39914749	36188_202607151000_NV	Casile Carmelo	NV	2026-07-15 10:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. Anticipo di 15.000€. SA che la vettura non è esposta	f	Presenza
39914750	36204_202607151400_AP	CIOLFI FRANCESCO	AP	2026-07-15 14:00:00	2026-07-29 15:31:01.471502	\N	Sa che il prezzo è con finanziamento, valuta finanziamento e piccolo anticipo	f	Presenza
39914751	36205_202607151700_SA	Pinghini Paolo	SA	2026-07-15 17:00:00	2026-07-29 15:31:01.471502	\N	sa di fin, mercedes slk del 2013, fa ritardo di 10 min, vuole fare il minimo possibile di finanziamento	f	Presenza
39914752	36222_202607161100_GC	Petucca Andrea	GC	2026-07-16 11:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta. Ha un usato una Peugeot 208	f	Presenza
39914891	36419_202607201200_NV	De Meo giuseppe	NV	2026-07-20 12:00:00	2026-07-29 15:31:01.471502	\N	INTERESSATO ALLA DACIA SANDERO USATO FINTO A 9,950 VEDI CAMPAGNA. Sa del prezzo con fin e lo valuta	f	Telefonico
39914892	36420_202607201400_BM	BOLOGNA GUIDO	BM	2026-07-20 14:00:00	2026-07-29 15:31:01.471502	\N	SA DI F0, VUOLE FIN	f	Presenza
39914893	36421_202607201500_SA	Palma Pietro	SA	2026-07-20 15:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con finanziamento e lo valuta. H un usato una Smart del 2011 con 170.000 km.	f	Telefonico
39914894	36423_202607201700_SA	Barberi Rocco	SA	2026-07-20 17:00:00	2026-07-29 15:31:01.471502	\N	Sa del prezzo con finanziamento e lo valuta. Ha un una rottamazione, una Punto del 2011 con 210.000 km	f	Telefonico
39914895	36424_202607201500_MR	Bellucci Eleonora	MR	2026-07-20 15:00:00	2026-07-29 15:31:01.471502	\N	(fuori Roma) SA che il prezzo è con finanziamento, lo valuta. Non ha vettura da rendere	f	Telefonico
39914896	36425_202607201200_BM	Mineo Elena	BM	2026-07-20 12:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin e lo valuta, vorrebbe dare anticipo	f	Telefonico
39914897	36426_202607201400_LL	Gizi Romano	LL	2026-07-20 14:00:00	2026-07-29 15:31:01.471502	\N	Smart 120.000 km del 2009 usato. Sa che il prezzo è con fin e lo valuta	f	Telefonico
39914898	36427_202607201800_NV	Bianchi Alessandro	NV	2026-07-20 18:00:00	2026-07-29 15:31:01.471502	\N	sa del prezzo con fin, sa che è una vettura in prevendita e che non è espsota. Valuta fin e ha usato una Sandero del 2024 con 23.000 km. INTERESSATO ALLA HYUNDAI I10 A 7,950	f	Presenza
39914890	36417_202607201200_IS	Somannà Ignazio	IS	2026-07-20 12:00:00	2026-07-29 15:31:01.471502	\N	SA che il prezzo è con finanziamento. Valutava il finanziamento	f	Telefonico
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, client_id, file_name, file_path, uploaded_at) FROM stdin;
2	2	rossomandilogo.jpg	uploads/1779286777935-446095118.jpg	2026-05-20 16:19:37.961673+02
3	4	rossomandilogo.jpg	uploads/1779349157248-465254005.jpg	2026-05-21 09:39:17.252742+02
5	6	react-logo@3x.png	uploads/1783506466630-389073830.png	2026-07-08 12:27:46.659915+02
\.


--
-- Data for Name: office_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.office_messages (id, user_id, message_text, created_at, reply_to_id, deleted) FROM stdin;
1	1	ciao	2026-07-13 14:42:27.244166+02	\N	f
2	4	ciao come stai	2026-07-13 14:43:07.178429+02	\N	f
3	1	ciao come stai	2026-07-13 14:46:07.837214+02	\N	f
4	4	ciao sto bene	2026-07-13 14:46:24.80562+02	\N	f
5	1	hello	2026-07-15 12:44:24.815905+02	\N	f
6	4	hi how are you	2026-07-15 12:45:18.621912+02	\N	f
7	1	yes sto bene	2026-07-15 12:45:33.125978+02	\N	f
8	4	hello	2026-07-16 16:01:56.468569+02	\N	f
9	1	ciao	2026-07-16 17:27:46.151025+02	\N	f
10	4	Ciao	2026-07-17 15:25:56.057897+02	\N	f
11	1	Junaid	2026-07-17 15:26:22.124492+02	\N	f
12	1	Thanks	2026-07-17 15:26:33.411735+02	\N	f
13	1	caio\nprova	2026-07-17 17:13:21.234495+02	\N	f
14	4	si si prova	2026-07-17 17:13:36.633268+02	\N	f
15	1	Ciao come stai	2026-07-20 15:53:55.974559+02	\N	f
16	4	ciao	2026-07-21 10:50:26.348166+02	\N	f
17	1	hi how are you?	2026-07-21 10:51:32.40715+02	\N	f
18	4	si , Im good whats about you.	2026-07-21 10:51:52.038464+02	\N	f
19	1	hello	2026-07-21 13:37:23.511206+02	\N	f
20	4	come stai	2026-07-21 13:37:43.185458+02	\N	f
21	1	sto bene	2026-07-21 13:37:51.931382+02	\N	f
22	4	Prova	2026-07-22 09:56:44.605324+02	\N	f
23	1	Ciao	2026-07-22 09:57:15.948479+02	\N	f
24	1	Ciao!	2026-07-22 10:06:33.951202+02	\N	f
25	1	Eliana	2026-07-22 10:06:42.517779+02	\N	f
26	15	ciao sono massimo	2026-07-22 11:50:41.163466+02	\N	f
27	1	Ciao Massimo	2026-07-22 12:06:13.111214+02	\N	f
28	1	ok grazie	2026-07-22 14:45:00.799504+02	\N	f
29	1	Ciao	2026-07-22 15:32:39.38703+02	\N	f
30	1	Ciaoo	2026-07-22 15:32:45.026025+02	\N	f
31	15	hello	2026-07-23 09:24:15.478427+02	\N	f
32	4	hi	2026-07-23 09:24:37.240061+02	\N	f
\.


--
-- Data for Name: policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.policies (id, client_id, policy_number, policy_type, status, coverage_details, created_at) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (key, value) FROM stdin;
chat_enabled	true
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, role, phone, address, created_at, venditore_code) FROM stdin;
6	Marco	marco@gmail.com	$2b$10$PtuR2jEmbTfM7.JcoRL.ze8FgWxinMHdaiyCYyN1LGC9DE8YeS.8G	client	+395118466	Florence	2026-07-08 12:24:59.926423+02	\N
7	Andrea	andrea@gmail.com	$2b$10$WQoGTO/BTuQytbL27RBqJ.GS3zKPwjF66zOQ6GPo53lrRwWBkxyaG	client	+396551925	Pistoia	2026-07-08 12:28:36.228052+02	\N
4	Simone	simone@gmail.com	$2b$10$lW3t4hBDnmQLssOJOjPK9uA23OzV0QMEnn9VbAHq2hQVY1rhSS2gu	seller	348154877	vie fermi rossomandi,Pistoia	2026-05-21 09:37:00.968118+02	SC
2	Mr.Lorenzo CEO Rossomandi	Lorenzo@gmail.com	$2b$10$QTl1LtRh8vVrb.Qc1yXuYe9ExuPczjzjfQFoTws30vHtKKhrgdC3O	admin	12345678	Pistoia Firenze	2026-05-20 13:11:36.124499+02	\N
1	System Admin	admin@rossomandi.com	$2b$10$qYV.FwMoGxxoiM2OebztZ.YcfTE4xkQKR3NFluZS6TSGY7NPDOH0C	admin	\N	\N	2026-05-20 12:40:54.042187+02	\N
30	junaid janjua	junaidmunir.janjua1@rossomandi.com	$2b$10$BSzBeGYYsBUhgSzW62gNY.IR4RUIecddCqA9HCZeWl3IVB3xATquO	admin	\N	\N	2026-07-21 12:39:33.906941+02	\N
15	Massimo (MR)	massimo@rossomandi.com	$2b$10$FNmunbZFxIMvLMkTxtXWBuatTCFCrspkun4RbAXGDemNS7C7u5Ti6	seller	\N	\N	2026-07-21 11:05:57.322208+02	MR
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicles (id, client_id, make, model, year, license_plate, created_at) FROM stdin;
1	2	000	111	2026	abc123	2026-05-20 16:45:39.782781+02
2	4	1234	010101	2026	\N	2026-05-21 09:39:47.39627+02
8	6	Citroen	110	2012	AB123	2026-07-08 12:25:53.682375+02
9	7	Fiat	241	2020	ITALY123	2026-07-08 12:29:12.168719+02
\.


--
-- Data for Name: workshop_visits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workshop_visits (id, client_id, vehicle_id, visit_date, fixes_performed, next_instructions, created_at) FROM stdin;
31	2	\N	2026-05-20 02:00:00+02	i changed oil of vehicale	\N	2026-05-20 16:54:46.828309+02
32	4	\N	2026-05-20 02:00:00+02	cambia gomme	prosimo oli di motore	2026-05-21 09:40:52.451714+02
46	6	\N	2026-07-07 02:00:00+02	Cambia vetri	combero  olio 	2026-07-08 12:26:50.575936+02
47	7	\N	2026-06-22 02:00:00+02	change the Tire of the car	We will change teh Engin Oil 	2026-07-08 12:30:11.834801+02
\.


--
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appointments_id_seq', 49028576, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_id_seq', 5, true);


--
-- Name: office_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.office_messages_id_seq', 32, true);


--
-- Name: policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.policies_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 31, true);


--
-- Name: vehicles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vehicles_id_seq', 9, true);


--
-- Name: workshop_visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workshop_visits_id_seq', 47, true);


--
-- Name: appointments appointments_intorno_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_intorno_key UNIQUE (intorno);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: office_messages office_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_messages
    ADD CONSTRAINT office_messages_pkey PRIMARY KEY (id);


--
-- Name: policies policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_pkey PRIMARY KEY (id);


--
-- Name: policies policies_policy_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_policy_number_key UNIQUE (policy_number);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: workshop_visits workshop_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_visits
    ADD CONSTRAINT workshop_visits_pkey PRIMARY KEY (id);


--
-- Name: idx_appointments_venditore; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_venditore ON public.appointments USING btree (venditore);


--
-- Name: documents documents_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: office_messages office_messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_messages
    ADD CONSTRAINT office_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.office_messages(id) ON DELETE SET NULL;


--
-- Name: office_messages office_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_messages
    ADD CONSTRAINT office_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: policies policies_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vehicles vehicles_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workshop_visits workshop_visits_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_visits
    ADD CONSTRAINT workshop_visits_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workshop_visits workshop_visits_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_visits
    ADD CONSTRAINT workshop_visits_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict EIa2bwKX0zzQndBqMIXTnok8Mosjd3IA3lHMk8ITHHUJGCmsu22abgqhIp7nJUC

