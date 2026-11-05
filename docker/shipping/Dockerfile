FROM maven:3.9.16-eclipse-temurin-8 AS build
WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

COPY pom.xml .
COPY src ./src
RUN mvn --batch-mode clean package \
    && cp target/shipping-1.0.jar /app/shipping.jar

FROM eclipse-temurin:8-jre-jammy
WORKDIR /app
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/shipping.jar ./shipping.jar
EXPOSE 8080
CMD ["java", "-jar", "shipping.jar"]
