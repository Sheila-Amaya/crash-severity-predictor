-- =============================================================================
-- Script DDL — PostgreSQL + PostGIS
-- Período de datos: 2018–2024
-- Fuente datos: INE — Microdatos de Hechos de Tránsito
-- Fuente cartografía: IDEG — Infraestructura de Datos Espaciales de Guatemala
-- Tablas: 25 (2 principales + 2 puente + 19 catálogos + 2 geoespaciales)
-- =============================================================================


-- =============================================================================
-- DROP 
-- =============================================================================
DROP TABLE IF EXISTS municipio_geom            CASCADE;
DROP TABLE IF EXISTS departamento_geom         CASCADE;
DROP TABLE IF EXISTS fallecido_lesionado       CASCADE;
DROP TABLE IF EXISTS vehiculo_involucrado      CASCADE;
DROP TABLE IF EXISTS vehiculo                  CASCADE;
DROP TABLE IF EXISTS hecho                     CASCADE;
DROP TABLE IF EXISTS cat_internado             CASCADE;
DROP TABLE IF EXISTS cat_fall_les              CASCADE;
DROP TABLE IF EXISTS cat_estado_conductor      CASCADE;
DROP TABLE IF EXISTS cat_mayor_menor           CASCADE;
DROP TABLE IF EXISTS cat_edad_quinquenal       CASCADE;
DROP TABLE IF EXISTS cat_grupo_edad_60         CASCADE;
DROP TABLE IF EXISTS cat_grupo_edad_80         CASCADE;
DROP TABLE IF EXISTS cat_sexo                  CASCADE;
DROP TABLE IF EXISTS cat_color_vehiculo        CASCADE;
DROP TABLE IF EXISTS cat_modelo_vehiculo       CASCADE;
DROP TABLE IF EXISTS cat_grupo_modelo          CASCADE;
DROP TABLE IF EXISTS cat_marca_vehiculo        CASCADE;
DROP TABLE IF EXISTS cat_tipo_vehiculo         CASCADE;
DROP TABLE IF EXISTS cat_tipo_evento           CASCADE;
DROP TABLE IF EXISTS cat_municipio             CASCADE;
DROP TABLE IF EXISTS cat_departamento          CASCADE;
DROP TABLE IF EXISTS cat_dia_semana            CASCADE;
DROP TABLE IF EXISTS cat_grupo_hora_5          CASCADE;
DROP TABLE IF EXISTS cat_grupo_hora            CASCADE;


CREATE EXTENSION IF NOT EXISTS postgis;


-- =============================================================================
-- SECCIÓN 1: CATÁLOGOS TEMPORALES
-- =============================================================================

CREATE TABLE cat_grupo_hora (
    g_hora      INTEGER     NOT NULL,
    descripcion VARCHAR(50) NOT NULL,
    CONSTRAINT pk_cat_grupo_hora PRIMARY KEY (g_hora)
);
COMMENT ON TABLE  cat_grupo_hora        IS 'Agrupación de horas del día en bloques de 6 horas';
COMMENT ON COLUMN cat_grupo_hora.g_hora IS '1=00-05h, 2=06-11h, 3=12-17h, 4=18-23h, 5=Ignorada';

INSERT INTO cat_grupo_hora VALUES
    (1,'00:00 a 05:59'),(2,'06:00 a 11:59'),
    (3,'12:00 a 17:59'),(4,'18:00 a 23:59'),(5,'Ignorada');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_grupo_hora_5 (
    g_hora_5    INTEGER     NOT NULL,
    g_hora      INTEGER     NOT NULL,
    descripcion VARCHAR(50) NOT NULL,
    CONSTRAINT pk_cat_grupo_hora_5 PRIMARY KEY (g_hora_5),
    CONSTRAINT fk_gh5_grupo_hora   FOREIGN KEY (g_hora) REFERENCES cat_grupo_hora(g_hora)
);
COMMENT ON TABLE  cat_grupo_hora_5          IS 'Agrupación horaria en Mañana, Tarde y Noche';
COMMENT ON COLUMN cat_grupo_hora_5.g_hora_5 IS '1=Mañana, 2=Tarde, 3=Noche, 4=Ignorada';

INSERT INTO cat_grupo_hora_5 VALUES
    (1,2,'Mañana'),(2,3,'Tarde'),(3,4,'Noche'),(4,5,'Ignorada');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_dia_semana (
    dia_sem_ocu INTEGER     NOT NULL,
    nombre      VARCHAR(20) NOT NULL,
    CONSTRAINT pk_cat_dia_semana PRIMARY KEY (dia_sem_ocu)
);
COMMENT ON TABLE cat_dia_semana IS 'Días de la semana (1=Lunes … 7=Domingo)';

INSERT INTO cat_dia_semana VALUES
    (1,'Lunes'),(2,'Martes'),(3,'Miércoles'),(4,'Jueves'),
    (5,'Viernes'),(6,'Sábado'),(7,'Domingo');

-- =============================================================================
-- SECCIÓN 2: CATÁLOGOS GEOGRÁFICOS
-- =============================================================================

CREATE TABLE cat_departamento (
    depto_ocu INTEGER     NOT NULL,
    nombre    VARCHAR(60) NOT NULL,
    CONSTRAINT pk_cat_departamento PRIMARY KEY (depto_ocu)
);
COMMENT ON TABLE cat_departamento IS '22 departamentos de la República de Guatemala';

INSERT INTO cat_departamento VALUES
    (1,'Guatemala'),(2,'El Progreso'),(3,'Sacatepéquez'),(4,'Chimaltenango'),
    (5,'Escuintla'),(6,'Santa Rosa'),(7,'Sololá'),(8,'Totonicapán'),
    (9,'Quetzaltenango'),(10,'Suchitepéquez'),(11,'Retalhuleu'),(12,'San Marcos'),
    (13,'Huehuetenango'),(14,'Quiché'),(15,'Baja Verapaz'),(16,'Alta Verapaz'),
    (17,'Petén'),(18,'Izabal'),(19,'Zacapa'),(20,'Chiquimula'),
    (21,'Jalapa'),(22,'Jutiapa');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_municipio (
    mupio_ocu INTEGER     NOT NULL,
    depto_ocu INTEGER     NOT NULL,
    nombre    VARCHAR(80) NOT NULL,
    CONSTRAINT pk_cat_municipio     PRIMARY KEY (mupio_ocu),
    CONSTRAINT fk_mpio_departamento FOREIGN KEY (depto_ocu) REFERENCES cat_departamento(depto_ocu)
);
COMMENT ON TABLE  cat_municipio           IS '340 municipios de Guatemala. Código oficial DDMM';
COMMENT ON COLUMN cat_municipio.mupio_ocu IS 'Código oficial del municipio en formato DDMM';

-- =============================================================================
-- SECCIÓN 3: CATÁLOGOS DE EVENTO
-- =============================================================================

CREATE TABLE cat_tipo_evento (
    tipo_eve    INTEGER     NOT NULL,
    descripcion VARCHAR(50) NOT NULL,
    CONSTRAINT pk_cat_tipo_evento PRIMARY KEY (tipo_eve)
);
COMMENT ON TABLE cat_tipo_evento IS 'Clasificación del tipo de hecho de tránsito';

INSERT INTO cat_tipo_evento VALUES
    (1,'Colisión'),(2,'Choque'),(3,'Vuelco'),(4,'Caída'),
    (5,'Atropello'),(6,'Derrape'),(7,'Embarranco'),(8,'Encuneto'),(99,'Ignorado');

-- =============================================================================
-- SECCIÓN 4: CATÁLOGOS DE VEHÍCULO
-- =============================================================================

CREATE TABLE cat_tipo_vehiculo (
    tipo_veh    INTEGER     NOT NULL,
    descripcion VARCHAR(60) NOT NULL,
    CONSTRAINT pk_cat_tipo_vehiculo PRIMARY KEY (tipo_veh)
);
COMMENT ON TABLE cat_tipo_vehiculo IS '24 tipos de vehículo + ignorado';

INSERT INTO cat_tipo_vehiculo VALUES
    (1,'Automóvil'),(2,'Camioneta sport / blazer'),(3,'Pick up'),(4,'Motocicleta'),
    (5,'Camión'),(6,'Cabezal'),(7,'Bus extraurbano'),(8,'Jeep'),(9,'Microbús'),
    (10,'Taxi'),(11,'Panel'),(12,'Bus urbano'),(13,'Tractor'),(14,'Mototaxi'),
    (15,'Furgón'),(16,'Grúa'),(17,'Bus escolar'),(18,'Bicicleta'),(19,'Avioneta'),
    (20,'Montacargas'),(21,'Bus militar'),(22,'Cuatrimoto'),(23,'Furgoneta'),
    (24,'Motos acuáticas'),(99,'Ignorado');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_marca_vehiculo (
    marca_veh INTEGER     NOT NULL,
    nombre    VARCHAR(60) NOT NULL,
    CONSTRAINT pk_cat_marca_vehiculo PRIMARY KEY (marca_veh)
);
COMMENT ON TABLE cat_marca_vehiculo IS '190+ marcas de vehículos. Código 999=Ignorado';

-- -----------------------------------------------------------------------------

CREATE TABLE cat_grupo_modelo (
    g_modelo_veh INTEGER     NOT NULL,
    descripcion  VARCHAR(20) NOT NULL,
    CONSTRAINT pk_cat_grupo_modelo PRIMARY KEY (g_modelo_veh)
);
COMMENT ON TABLE cat_grupo_modelo IS 'Agrupación de modelos de vehículos por décadas';

INSERT INTO cat_grupo_modelo VALUES
    (1,'1970–1979'),(2,'1980–1989'),(3,'1990–1999'),
    (4,'2000–2009'),(5,'2010–2019'),(6,'2020–2029'),(99,'Ignorado');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_modelo_vehiculo (
    modelo_veh   INTEGER     NOT NULL,
    marca_veh    INTEGER     NOT NULL,
    g_modelo_veh INTEGER     NOT NULL,
    nombre       VARCHAR(80) NOT NULL,
    anio         INTEGER,
    CONSTRAINT pk_cat_modelo_vehiculo PRIMARY KEY (modelo_veh),
    CONSTRAINT fk_modelo_marca        FOREIGN KEY (marca_veh)    REFERENCES cat_marca_vehiculo(marca_veh),
    CONSTRAINT fk_modelo_grupo        FOREIGN KEY (g_modelo_veh) REFERENCES cat_grupo_modelo(g_modelo_veh)
);
COMMENT ON COLUMN cat_modelo_vehiculo.modelo_veh IS 'Código del modelo. 9999=Ignorado';

-- -----------------------------------------------------------------------------

CREATE TABLE cat_color_vehiculo (
    color_veh INTEGER     NOT NULL,
    nombre    VARCHAR(30) NOT NULL,
    CONSTRAINT pk_cat_color_vehiculo PRIMARY KEY (color_veh)
);
COMMENT ON TABLE cat_color_vehiculo IS '17 colores de vehículos + ignorado';

INSERT INTO cat_color_vehiculo VALUES
    (1,'Rojo'),(2,'Blanco'),(3,'Azul'),(4,'Gris'),(5,'Negro'),(6,'Verde'),
    (7,'Amarillo'),(8,'Celeste'),(9,'Corinto'),(10,'Café'),(11,'Beige'),
    (12,'Turquesa'),(13,'Marfil'),(14,'Anaranjado'),(15,'Morado'),
    (16,'Rosado'),(17,'Varios colores'),(99,'Ignorado');

-- =============================================================================
-- SECCIÓN 5: CATÁLOGOS DE PERSONA
-- =============================================================================

CREATE TABLE cat_sexo (
    sexo_per    INTEGER     NOT NULL,
    descripcion VARCHAR(20) NOT NULL,
    CONSTRAINT pk_cat_sexo PRIMARY KEY (sexo_per)
);
INSERT INTO cat_sexo VALUES (1,'Hombre'),(2,'Mujer'),(9,'Ignorado');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_grupo_edad_80 (
    g_edad_80ymas INTEGER     NOT NULL,
    descripcion   VARCHAR(30) NOT NULL,
    CONSTRAINT pk_cat_grupo_edad_80 PRIMARY KEY (g_edad_80ymas)
);
COMMENT ON TABLE cat_grupo_edad_80 IS 'Agrupación de edades con corte en 80 y más años';

INSERT INTO cat_grupo_edad_80 VALUES
    (1,'Menor de 15'),(2,'15–19'),(3,'20–24'),(4,'25–29'),(5,'30–34'),
    (6,'35–39'),(7,'40–44'),(8,'45–49'),(9,'50–54'),(10,'55–59'),
    (11,'60–64'),(12,'65–69'),(13,'70–74'),(14,'75–79'),(15,'80 y más'),(16,'Ignorado');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_grupo_edad_60 (
    g_edad_60ymas INTEGER     NOT NULL,
    g_edad_80ymas INTEGER     NOT NULL,
    descripcion   VARCHAR(30) NOT NULL,
    CONSTRAINT pk_cat_grupo_edad_60  PRIMARY KEY (g_edad_60ymas),
    CONSTRAINT fk_ge60_grupo_edad_80 FOREIGN KEY (g_edad_80ymas) REFERENCES cat_grupo_edad_80(g_edad_80ymas)
);
COMMENT ON TABLE cat_grupo_edad_60 IS 'Agrupación de edades con corte en 60 y más años';

INSERT INTO cat_grupo_edad_60 (g_edad_60ymas, g_edad_80ymas, descripcion) VALUES
    (1,  1,  'Menor de 15'),(2,  2,  '15–19'),(3,  3,  '20–24'),(4,  4,  '25–29'),
    (5,  5,  '30–34'),(6,  6,  '35–39'),(7,  7,  '40–44'),(8,  8,  '45–49'),(9,  9,  '50–54'),
    (10, 10, '55–59'),(11, 11, '60 y más'),(12, 16, 'Ignorado');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_edad_quinquenal (
    edad_quinquenales INTEGER     NOT NULL,
    g_edad_60ymas     INTEGER     NOT NULL,
    descripcion       VARCHAR(20) NOT NULL,
    CONSTRAINT pk_cat_edad_quinquenal PRIMARY KEY (edad_quinquenales),
    CONSTRAINT fk_eq_grupo_edad_60    FOREIGN KEY (g_edad_60ymas) REFERENCES cat_grupo_edad_60(g_edad_60ymas)
);
COMMENT ON TABLE cat_edad_quinquenal IS 'Grupos de edad en intervalos de 5 años. Código 18=Ignorado';

INSERT INTO cat_edad_quinquenal VALUES
    (1,1,'0–4'),(2,1,'5–9'),(3,1,'10–14'),(4,2,'15–19'),(5,3,'20–24'),
    (6,4,'25–29'),(7,5,'30–34'),(8,6,'35–39'),(9,7,'40–44'),(10,8,'45–49'),
    (11,9,'50–54'),(12,10,'55–59'),(13,11,'60–64'),(14,11,'65–69'),
    (15,11,'70–74'),(16,11,'75–79'),(17,11,'80 y más'),(18,11,'Ignorado');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_mayor_menor (
    mayor_menor INTEGER     NOT NULL,
    descripcion VARCHAR(20) NOT NULL,
    CONSTRAINT pk_cat_mayor_menor PRIMARY KEY (mayor_menor)
);
INSERT INTO cat_mayor_menor VALUES (1,'Mayor'),(2,'Menor'),(9,'Ignorado');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_estado_conductor (
    estado_con  INTEGER     NOT NULL,
    descripcion VARCHAR(20) NOT NULL,
    CONSTRAINT pk_cat_estado_conductor PRIMARY KEY (estado_con)
);
INSERT INTO cat_estado_conductor VALUES (1,'No ebrio'),(2,'Ebrio'),(9,'Ignorado');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_fall_les (
    fall_les    INTEGER     NOT NULL,
    nombre      VARCHAR(20) NOT NULL,
    CONSTRAINT pk_cat_fall_les PRIMARY KEY (fall_les)
);
COMMENT ON TABLE cat_fall_les IS 'Catálogo que almacena la variable objetivo (target) utilizada por el modelo de aprendizaje automático.';
INSERT INTO cat_fall_les VALUES (1,'Fallecido'),(2,'Lesionado'),(3,'Ignorado');

-- -----------------------------------------------------------------------------

CREATE TABLE cat_internado (
    int_o_noint INTEGER     NOT NULL,
    descripcion VARCHAR(20) NOT NULL,
    CONSTRAINT pk_cat_internado PRIMARY KEY (int_o_noint)
);
INSERT INTO cat_internado VALUES (1,'Internado'),(2,'No internado'),(9,'Ignorado');

-- =============================================================================
-- SECCIÓN 6: TABLAS DE HECHOS
-- =============================================================================

CREATE TABLE hecho (
    num_corre   INTEGER NOT NULL,
    anio_ocu    INTEGER NOT NULL,
    mes_ocu     INTEGER NOT NULL,
    dia_ocu     INTEGER NOT NULL,
    hora_ocu    INTEGER NOT NULL,
    zona_ocu    INTEGER NOT NULL DEFAULT 99,
    g_hora      INTEGER NOT NULL,
    g_hora_5    INTEGER NOT NULL,
    dia_sem_ocu INTEGER NOT NULL,
    mupio_ocu   INTEGER NOT NULL,
    tipo_eve    INTEGER NOT NULL,
    CONSTRAINT pk_hecho             PRIMARY KEY (num_corre, anio_ocu),
    CONSTRAINT fk_hecho_g_hora      FOREIGN KEY (g_hora)      REFERENCES cat_grupo_hora(g_hora),
    CONSTRAINT fk_hecho_g_hora_5    FOREIGN KEY (g_hora_5)    REFERENCES cat_grupo_hora_5(g_hora_5),
    CONSTRAINT fk_hecho_dia_semana  FOREIGN KEY (dia_sem_ocu) REFERENCES cat_dia_semana(dia_sem_ocu),
    CONSTRAINT fk_hecho_municipio   FOREIGN KEY (mupio_ocu)   REFERENCES cat_municipio(mupio_ocu),
    CONSTRAINT fk_hecho_tipo_evento FOREIGN KEY (tipo_eve)    REFERENCES cat_tipo_evento(tipo_eve),
    CONSTRAINT chk_hecho_mes        CHECK (mes_ocu  BETWEEN 1 AND 12),
    CONSTRAINT chk_hecho_dia        CHECK (dia_ocu  BETWEEN 1 AND 31),
    CONSTRAINT chk_hecho_hora       CHECK (hora_ocu BETWEEN 0 AND 23),
    CONSTRAINT chk_hecho_zona       CHECK (zona_ocu BETWEEN 1 AND 25 OR zona_ocu = 99),
    CONSTRAINT chk_hecho_anio       CHECK (anio_ocu BETWEEN 2018 AND 2024)
);
COMMENT ON TABLE  hecho           IS 'Tabla central. Hechos de tránsito 2018-2024';
COMMENT ON COLUMN hecho.num_corre IS 'Correlativo INE. Se reinicia cada año — PK compuesta con anio_ocu';
COMMENT ON COLUMN hecho.zona_ocu  IS 'Zona urbana. 99=Ignorada';

-- -----------------------------------------------------------------------------

CREATE TABLE vehiculo (
    id_vehiculo SERIAL  NOT NULL,
    tipo_veh    INTEGER NOT NULL,
    marca_veh   INTEGER NOT NULL,
    modelo_veh  INTEGER NOT NULL,
    color_veh   INTEGER NOT NULL,
    CONSTRAINT pk_vehiculo        PRIMARY KEY (id_vehiculo),
    CONSTRAINT fk_vehiculo_tipo   FOREIGN KEY (tipo_veh)   REFERENCES cat_tipo_vehiculo(tipo_veh),
    CONSTRAINT fk_vehiculo_marca  FOREIGN KEY (marca_veh)  REFERENCES cat_marca_vehiculo(marca_veh),
    CONSTRAINT fk_vehiculo_modelo FOREIGN KEY (modelo_veh) REFERENCES cat_modelo_vehiculo(modelo_veh),
    CONSTRAINT fk_vehiculo_color  FOREIGN KEY (color_veh)  REFERENCES cat_color_vehiculo(color_veh)
);
COMMENT ON TABLE vehiculo IS 'Registro de vehículos involucrados en hechos de tránsito';

-- =============================================================================
-- SECCIÓN 7: TABLAS PUENTE (N:M)
-- =============================================================================

CREATE TABLE vehiculo_involucrado (
    id_vehiculo_inv   SERIAL  NOT NULL,
    num_corre         INTEGER NOT NULL,
    anio_ocu          INTEGER NOT NULL,
    id_vehiculo       INTEGER NOT NULL,
    sexo_per          INTEGER NOT NULL,
    edad_per          INTEGER NOT NULL DEFAULT 999,
    edad_quinquenales INTEGER NOT NULL,
    mayor_menor       INTEGER NOT NULL,
    estado_con        INTEGER NOT NULL,
    CONSTRAINT pk_vehiculo_involucrado   PRIMARY KEY (id_vehiculo_inv),
    CONSTRAINT fk_vi_hecho               FOREIGN KEY (num_corre, anio_ocu) REFERENCES hecho(num_corre, anio_ocu),
    CONSTRAINT fk_vi_vehiculo            FOREIGN KEY (id_vehiculo)         REFERENCES vehiculo(id_vehiculo),
    CONSTRAINT fk_vi_sexo                FOREIGN KEY (sexo_per)            REFERENCES cat_sexo(sexo_per),
    CONSTRAINT fk_vi_edad_quinquenal     FOREIGN KEY (edad_quinquenales)   REFERENCES cat_edad_quinquenal(edad_quinquenales),
    CONSTRAINT fk_vi_mayor_menor         FOREIGN KEY (mayor_menor)         REFERENCES cat_mayor_menor(mayor_menor),
    CONSTRAINT fk_vi_estado_conductor    FOREIGN KEY (estado_con)          REFERENCES cat_estado_conductor(estado_con),
    CONSTRAINT chk_vi_edad               CHECK (edad_per BETWEEN 0 AND 120 OR edad_per = 999)
);
COMMENT ON TABLE  vehiculo_involucrado         IS 'Tabla puente N:M. Hechos con conductores por vehículo';
COMMENT ON COLUMN vehiculo_involucrado.edad_per IS 'Edad exacta en años. 999=Ignorada';

-- -----------------------------------------------------------------------------

CREATE TABLE fallecido_lesionado (
    id_fall_les       SERIAL  NOT NULL,
    num_corre         INTEGER NOT NULL,
    anio_ocu          INTEGER NOT NULL,
    id_vehiculo       INTEGER NOT NULL,
    sexo_per          INTEGER NOT NULL,
    edad_per          INTEGER NOT NULL DEFAULT 999,
    edad_quinquenales INTEGER NOT NULL,
    mayor_menor       INTEGER NOT NULL,
    fall_les          INTEGER NOT NULL,
    int_o_noint       INTEGER NOT NULL,
    CONSTRAINT pk_fallecido_lesionado    PRIMARY KEY (id_fall_les),
    CONSTRAINT fk_fl_hecho               FOREIGN KEY (num_corre, anio_ocu) REFERENCES hecho(num_corre, anio_ocu),
    CONSTRAINT fk_fl_vehiculo            FOREIGN KEY (id_vehiculo)         REFERENCES vehiculo(id_vehiculo),
    CONSTRAINT fk_fl_sexo                FOREIGN KEY (sexo_per)            REFERENCES cat_sexo(sexo_per),
    CONSTRAINT fk_fl_edad_quinquenal     FOREIGN KEY (edad_quinquenales)   REFERENCES cat_edad_quinquenal(edad_quinquenales),
    CONSTRAINT fk_fl_mayor_menor         FOREIGN KEY (mayor_menor)         REFERENCES cat_mayor_menor(mayor_menor),
    CONSTRAINT fk_fl_fall_les            FOREIGN KEY (fall_les)            REFERENCES cat_fall_les(fall_les),
    CONSTRAINT fk_fl_internado           FOREIGN KEY (int_o_noint)         REFERENCES cat_internado(int_o_noint),
    CONSTRAINT chk_fl_edad               CHECK (edad_per BETWEEN 0 AND 120 OR edad_per = 999)
);
COMMENT ON TABLE  fallecido_lesionado          IS 'Tabla puente N:M. Registra las víctimas asociadas a cada hecho de tránsito y contiene la variable objetivo utilizada por el modelo de aprendizaje automático.';
COMMENT ON COLUMN fallecido_lesionado.fall_les IS 'Variable target: 1=Fallecido, 2=Lesionado';
COMMENT ON COLUMN fallecido_lesionado.edad_per IS 'Edad exacta en años. 999=Ignorada';

-- =============================================================================
-- SECCIÓN 8: TABLAS GEOESPACIALES (PostGIS)
-- Fuente: IDEG — agrip_03_Limites_departamentales.json
--                agrip_04_Limites_municipales_340.json
-- =============================================================================

CREATE TABLE departamento_geom (
    cod_dep    INTEGER                     NOT NULL,
    nombre     VARCHAR(100)                NOT NULL,
    geom       GEOMETRY(MULTIPOLYGON,4326) NOT NULL,
    CONSTRAINT pk_departamento_geom PRIMARY KEY (cod_dep)
);
COMMENT ON TABLE  departamento_geom            IS 'Geometría oficial de los 22 departamentos. Fuente: IDEG';
COMMENT ON COLUMN departamento_geom.cod_dep    IS 'Código del departamento. Relación lógica con cat_departamento.depto_ocu.';
COMMENT ON COLUMN departamento_geom.nombre     IS 'Nombre oficial del departamento.';
COMMENT ON COLUMN departamento_geom.geom       IS 'Las geometrías fueron reproyectadas a WGS84 (EPSG:4326)';

-- -----------------------------------------------------------------------------

CREATE TABLE municipio_geom (
    cod_mun    INTEGER                     NOT NULL,
    cod_dep    INTEGER                     NOT NULL,
    nombre     VARCHAR(120)                NOT NULL,
    geom       GEOMETRY(MULTIPOLYGON,4326) NOT NULL,
    CONSTRAINT pk_municipio_geom PRIMARY KEY (cod_mun)
);
COMMENT ON TABLE  municipio_geom            IS 'Geometría oficial de los 340 municipios. Fuente: IDEG';
COMMENT ON COLUMN municipio_geom.cod_mun    IS 'Código del municipio. Relación lógica con cat_municipio.mupio_ocu.';
COMMENT ON COLUMN municipio_geom.cod_dep    IS 'Código del departamento al que pertenece el municipio';
COMMENT ON COLUMN municipio_geom.nombre     IS 'Nombre oficial del municipio';
COMMENT ON COLUMN municipio_geom.geom       IS 'Geometría MultiPolygon WGS84 (EPSG:4326)';


-- =============================================================================
-- SECCIÓN 9: ÍNDICES
-- =============================================================================

-- Índices B-Tree
CREATE INDEX idx_hecho_anio       ON hecho(anio_ocu);
CREATE INDEX idx_hecho_mupio      ON hecho(mupio_ocu);
CREATE INDEX idx_hecho_tipo_eve   ON hecho(tipo_eve);
CREATE INDEX idx_hecho_g_hora_5   ON hecho(g_hora_5);
CREATE INDEX idx_hecho_dia_sem    ON hecho(dia_sem_ocu);
CREATE INDEX idx_vi_hecho         ON vehiculo_involucrado(num_corre, anio_ocu);
CREATE INDEX idx_vi_vehiculo      ON vehiculo_involucrado(id_vehiculo);
CREATE INDEX idx_fl_hecho         ON fallecido_lesionado(num_corre, anio_ocu);
CREATE INDEX idx_fl_fall_les      ON fallecido_lesionado(fall_les);
CREATE INDEX idx_fl_vehiculo      ON fallecido_lesionado(id_vehiculo);

-- Índices espaciales GiST
CREATE INDEX idx_departamento_geom ON departamento_geom USING GIST(geom);
CREATE INDEX idx_municipio_geom    ON municipio_geom    USING GIST(geom);

-- =============================================================================
-- RESUMEN
-- Catálogos temporales  : 3
-- Catálogos geográficos : 2
-- Catálogos de evento   : 1
-- Catálogos de vehículo : 5
-- Catálogos de persona  : 8
-- Total catálogos       : 19
-- Tablas principales    : 2
-- Tablas puente         : 2
-- Tablas geoespaciales  : 2
-- TOTAL TABLAS          : 25
-- Índices B-Tree        : 10
-- Índices GiST          : 2
-- =============================================================================
