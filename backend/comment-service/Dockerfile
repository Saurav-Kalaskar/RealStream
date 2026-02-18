FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY comment-service/pom.xml comment-service/
COPY comment-service/src comment-service/src
RUN mvn -f comment-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/comment-service/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
