FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY content-service/pom.xml content-service/
COPY content-service/src content-service/src
RUN mvn -f content-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/content-service/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
