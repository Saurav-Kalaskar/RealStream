FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY interaction-service/pom.xml interaction-service/
COPY interaction-service/src interaction-service/src
RUN mvn -f interaction-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/interaction-service/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
