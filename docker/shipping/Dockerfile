FROM maven:3.9.16-eclipse-temurin-17 AS build
WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

COPY pom.xml .
COPY src ./src
RUN mvn --batch-mode clean package \
    && cp target/shipping-1.0.jar /app/shipping.jar

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/shipping.jar ./shipping.jar
RUN groupadd --system roboshop \
    && useradd --system --gid roboshop --home-dir /app --no-create-home --shell /usr/sbin/nologin roboshop \
    && chown roboshop:roboshop /app/shipping.jar
USER roboshop
EXPOSE 8080
CMD ["java", "-jar", "shipping.jar"]
