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
-- Name: tiger; Type: SCHEMA; Schema: -; Owner: untype
--

CREATE SCHEMA tiger;


ALTER SCHEMA tiger OWNER TO untype;

--
-- Name: tiger_data; Type: SCHEMA; Schema: -; Owner: untype
--

CREATE SCHEMA tiger_data;


ALTER SCHEMA tiger_data OWNER TO untype;

--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: untype
--

CREATE SCHEMA topology;


ALTER SCHEMA topology OWNER TO untype;

--
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: untype
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- Name: fuzzystrmatch; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA public;


--
-- Name: EXTENSION fuzzystrmatch; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION fuzzystrmatch IS 'determine similarities and distance between strings';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: postgis_tiger_geocoder; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder WITH SCHEMA tiger;


--
-- Name: EXTENSION postgis_tiger_geocoder; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_tiger_geocoder IS 'PostGIS tiger geocoder and reverse geocoder';


--
-- Name: postgis_topology; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA topology;


--
-- Name: EXTENSION postgis_topology; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_topology IS 'PostGIS topology spatial types and functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: trigger_set_updated_at(); Type: FUNCTION; Schema: public; Owner: untype
--

CREATE FUNCTION public.trigger_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.updated_at = clock_timestamp();
        RETURN NEW;
    END;
$$;


ALTER FUNCTION public.trigger_set_updated_at() OWNER TO untype;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: untype
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);


ALTER TABLE public.migrations OWNER TO untype;

--
-- Name: todos; Type: TABLE; Schema: public; Owner: untype
--

CREATE TABLE public.todos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    text text NOT NULL,
    status text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT clock_timestamp() NOT NULL,
    updated_at timestamp without time zone DEFAULT clock_timestamp() NOT NULL,
    cover text
);


ALTER TABLE public.todos OWNER TO untype;

--
-- Name: users; Type: TABLE; Schema: public; Owner: untype
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    created_at timestamp without time zone DEFAULT clock_timestamp() NOT NULL,
    updated_at timestamp without time zone DEFAULT clock_timestamp() NOT NULL
);


ALTER TABLE public.users OWNER TO untype;

--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: untype
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: todos todos_pkey; Type: CONSTRAINT; Schema: public; Owner: untype
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: untype
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: untype
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: todos_tags_idx; Type: INDEX; Schema: public; Owner: untype
--

CREATE INDEX todos_tags_idx ON public.todos USING gin (tags);


--
-- Name: todos_text_idx; Type: INDEX; Schema: public; Owner: untype
--

CREATE INDEX todos_text_idx ON public.todos USING gin (text public.gin_trgm_ops);


--
-- Name: todos_user_id_idx; Type: INDEX; Schema: public; Owner: untype
--

CREATE INDEX todos_user_id_idx ON public.todos USING btree (user_id);


--
-- Name: todos todos_updated_at; Type: TRIGGER; Schema: public; Owner: untype
--

CREATE TRIGGER todos_updated_at BEFORE UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: untype
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: todos todos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: untype
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

