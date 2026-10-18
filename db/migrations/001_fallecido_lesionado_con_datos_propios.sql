-- =============================================================================
-- Migración 001 — fallecido_lesionado con datos propios del evento
-- =============================================================================
-- Motivo:
--   num_corre NO es una llave compartida entre los archivos del INE
--   (hechos, vehículos involucrados, fallecidos y lesionados): es el
--   correlativo de fila de cada archivo, reiniciado cada año. La carga
--   original unía víctimas con hechos por (num_corre, anio_ocu), lo que
--   emparejaba registros por posición (coincidencia de municipio 5.1 %,
--   día 3.8 %, hora 5.0 %; las 5 columnas a la vez, 0.07 %) y descartaba
--   19,459 víctimas (27 %).
--
-- Solución:
--   Tabla nueva de víctimas con las columnas del evento que trae el propio
--   archivo de fallecidos y lesionados, sin FK a hecho.
--
-- Ejecución:
--   La ejecuta scripts/cargar_fallecido_lesionado.py en UNA transacción:
--     1) SECCIÓN 1  — crea fallecido_lesionado_nueva
--     2) (script)   — inserta las 71,942 filas y verifica conteos
--     3) SECCIÓN 2  — intercambio de nombres, solo si los conteos coinciden
--   Si algo no coincide, el script hace ROLLBACK y nada cambia.
--   La tabla fallecido_lesionado_old NO se borra aquí.
-- =============================================================================


-- @@SECCION_1_CREAR@@
-- =============================================================================
-- SECCIÓN 1: tabla nueva
-- =============================================================================

CREATE TABLE fallecido_lesionado_nueva (
    id_fall_les       INTEGER GENERATED ALWAYS AS IDENTITY,

    -- Trazabilidad con el archivo fuente (NO es llave hacia hecho)
    num_corre         INTEGER NOT NULL,

    -- Datos del evento, tal como vienen en el archivo de víctimas
    anio_ocu          INTEGER NOT NULL,
    mes_ocu           INTEGER NOT NULL,
    dia_ocu           INTEGER NOT NULL,
    hora_ocu          INTEGER NOT NULL,
    g_hora_5          INTEGER NOT NULL,
    dia_sem_ocu       INTEGER NOT NULL,
    mupio_ocu         INTEGER NOT NULL,
    depto_ocu         INTEGER NOT NULL,
    tipo_eve          INTEGER NOT NULL,

    -- Vehículo de la víctima
    id_vehiculo       INTEGER NOT NULL,
    tipo_veh          INTEGER NOT NULL,

    -- Datos de la persona
    sexo_per          INTEGER NOT NULL,
    edad_per          INTEGER NOT NULL DEFAULT 999,
    edad_quinquenales INTEGER NOT NULL,
    mayor_menor       INTEGER NOT NULL,
    fall_les          INTEGER NOT NULL,
    int_o_noint       INTEGER NOT NULL,

    CONSTRAINT pk_victima               PRIMARY KEY (id_fall_les),
    CONSTRAINT uq_victima_fuente        UNIQUE (anio_ocu, num_corre),

    CONSTRAINT fk_victima_g_hora_5      FOREIGN KEY (g_hora_5)          REFERENCES cat_grupo_hora_5(g_hora_5),
    CONSTRAINT fk_victima_dia_semana    FOREIGN KEY (dia_sem_ocu)       REFERENCES cat_dia_semana(dia_sem_ocu),
    CONSTRAINT fk_victima_municipio     FOREIGN KEY (mupio_ocu)         REFERENCES cat_municipio(mupio_ocu),
    CONSTRAINT fk_victima_departamento  FOREIGN KEY (depto_ocu)         REFERENCES cat_departamento(depto_ocu),
    CONSTRAINT fk_victima_tipo_evento   FOREIGN KEY (tipo_eve)          REFERENCES cat_tipo_evento(tipo_eve),
    CONSTRAINT fk_victima_vehiculo      FOREIGN KEY (id_vehiculo)       REFERENCES vehiculo(id_vehiculo),
    CONSTRAINT fk_victima_tipo_vehiculo FOREIGN KEY (tipo_veh)          REFERENCES cat_tipo_vehiculo(tipo_veh),
    CONSTRAINT fk_victima_sexo          FOREIGN KEY (sexo_per)          REFERENCES cat_sexo(sexo_per),
    CONSTRAINT fk_victima_edad_quinq    FOREIGN KEY (edad_quinquenales) REFERENCES cat_edad_quinquenal(edad_quinquenales),
    CONSTRAINT fk_victima_mayor_menor   FOREIGN KEY (mayor_menor)       REFERENCES cat_mayor_menor(mayor_menor),
    CONSTRAINT fk_victima_fall_les      FOREIGN KEY (fall_les)          REFERENCES cat_fall_les(fall_les),
    CONSTRAINT fk_victima_internado     FOREIGN KEY (int_o_noint)       REFERENCES cat_internado(int_o_noint),

    CONSTRAINT chk_victima_anio         CHECK (anio_ocu BETWEEN 2018 AND 2024),
    CONSTRAINT chk_victima_mes          CHECK (mes_ocu  BETWEEN 1 AND 12),
    CONSTRAINT chk_victima_dia          CHECK (dia_ocu  BETWEEN 1 AND 31),
    CONSTRAINT chk_victima_hora         CHECK (hora_ocu BETWEEN 0 AND 23 OR hora_ocu = 99),
    CONSTRAINT chk_victima_edad         CHECK (edad_per BETWEEN 0 AND 120 OR edad_per = 999)
);

COMMENT ON TABLE  fallecido_lesionado_nueva           IS 'Víctimas (fallecidos y lesionados) 2018-2024 con los datos del evento de su propio archivo INE. Sin FK a hecho: num_corre no es llave compartida entre archivos.';
COMMENT ON COLUMN fallecido_lesionado_nueva.num_corre IS 'Correlativo de fila del archivo de fallecidos y lesionados. NO relaciona con hecho.num_corre.';
COMMENT ON COLUMN fallecido_lesionado_nueva.tipo_veh  IS 'Tipo de vehículo de la víctima. Redundante con vehiculo.tipo_veh para filtrar e indexar sin JOIN.';
COMMENT ON COLUMN fallecido_lesionado_nueva.hora_ocu  IS 'Hora 0-23. 99=Ignorada';
COMMENT ON COLUMN fallecido_lesionado_nueva.fall_les  IS 'Variable target: 1=Fallecido, 2=Lesionado';

CREATE INDEX idx_victima_anio      ON fallecido_lesionado_nueva(anio_ocu);
CREATE INDEX idx_victima_depto     ON fallecido_lesionado_nueva(depto_ocu);
CREATE INDEX idx_victima_mupio     ON fallecido_lesionado_nueva(mupio_ocu);
CREATE INDEX idx_victima_g_hora_5  ON fallecido_lesionado_nueva(g_hora_5);
CREATE INDEX idx_victima_dia_sem   ON fallecido_lesionado_nueva(dia_sem_ocu);
CREATE INDEX idx_victima_tipo_eve  ON fallecido_lesionado_nueva(tipo_eve);
CREATE INDEX idx_victima_tipo_veh  ON fallecido_lesionado_nueva(tipo_veh);
CREATE INDEX idx_victima_sexo      ON fallecido_lesionado_nueva(sexo_per);
CREATE INDEX idx_victima_edad_q    ON fallecido_lesionado_nueva(edad_quinquenales);
CREATE INDEX idx_victima_fall_les  ON fallecido_lesionado_nueva(fall_les);


-- @@SECCION_2_INTERCAMBIO@@
-- =============================================================================
-- SECCIÓN 2: intercambio (solo tras verificar conteos)
-- =============================================================================

ALTER TABLE fallecido_lesionado       RENAME TO fallecido_lesionado_old;
ALTER TABLE fallecido_lesionado_nueva RENAME TO fallecido_lesionado;
