-- Script d'initialisation Kuzu : Création du schéma et données de test
-- Copie-colle ces queries une par une dans le dashboard

-- 1. Créer la table de noeuds Person
CREATE NODE TABLE Person(name STRING, age INT64, PRIMARY KEY(name));

-- 2. Créer la table de relation KNOWS
CREATE REL TABLE KNOWS(FROM Person TO Person, since STRING);

-- 3. Insérer quelques personnes
CREATE (a:Person {name: 'Alice', age: 30});
CREATE (b:Person {name: 'Bob', age: 25});
CREATE (c:Person {name: 'Charlie', age: 35});
CREATE (d:Person {name: 'Diana', age: 28});

-- 4. Créer des relations entre elles
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}) 
CREATE (a)-[:KNOWS {since: '2020'}]->(b);

MATCH (a:Person {name: 'Alice'}), (c:Person {name: 'Charlie'}) 
CREATE (a)-[:KNOWS {since: '2021'}]->(c);

MATCH (b:Person {name: 'Bob'}), (d:Person {name: 'Diana'}) 
CREATE (b)-[:KNOWS {since: '2022'}]->(d);

MATCH (c:Person {name: 'Charlie'}), (d:Person {name: 'Diana'}) 
CREATE (c)-[:KNOWS {since: '2023'}]->(d);

-- 5. Vérifier que tout fonctionne - cette query doit retourner des résultats
MATCH (a:Person)-[r:KNOWS]->(b:Person) 
RETURN a.name AS from_person, r.since AS since, b.name AS to_person;

-- 6. Query pour le graph visuel (celle que le dashboard utilise)
MATCH (a:Person)-[r:KNOWS]->(b:Person) 
RETURN id(a) AS a_id, labels(a) AS a_labels, a AS a_props,
       id(b) AS b_id, labels(b) AS b_labels, b AS b_props,
       type(r) AS e_type
LIMIT 100;
