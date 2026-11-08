CREATE DATABASE IF NOT EXISTS cities;
USE cities;

CREATE TABLE IF NOT EXISTS cities (
  uuid BIGINT NOT NULL AUTO_INCREMENT,
  country_code VARCHAR(2) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  name VARCHAR(100) DEFAULT NULL,
  region VARCHAR(100) DEFAULT NULL,
  latitude DECIMAL(10,7) DEFAULT NULL,
  longitude DECIMAL(10,7) DEFAULT NULL,
  PRIMARY KEY (uuid),
  KEY region_idx (region),
  KEY c_code_idx (country_code),
  KEY country_city_idx (country_code, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS codes (
  uuid BIGINT NOT NULL AUTO_INCREMENT,
  code VARCHAR(2) NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (uuid),
  UNIQUE KEY code_unique (code),
  KEY code_name_idx (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
