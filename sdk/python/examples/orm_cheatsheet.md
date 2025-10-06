# Casys ORM Cheatsheet (EF-like)

Ce guide résume l'usage de l'ORM Casys en style Entity Framework (LINQ-like).

## 1) Setup

```python
from casys_db import Session
# branch = CasysBranch (fourni par casys_engine)
session = Session(branch)
```

## 2) Déclarer des entités (sans strings)

```python
from casys_db import NodeEntity, HasMany, HasOne
from typing import Self

class City(NodeEntity):
    pass  # label implicite: "City"

class Person(NodeEntity):
    # Relations sans strings
    lives_in = HasOne(City)              # via auto: LIVES_IN, target: City
    friends = HasMany(Self)              # via auto: FRIENDS, target: Person
    colleagues = HasMany(Self, via="KNOWS")  # override via si besoin
    network = HasMany(Self).depth(1, 3)  # profondeur variable
```

## 3) Sélectionner une « table » (DbSet-like)

```python
# Canonique (EF-like): entités complètes (RETURN p)
people = session.Person.where(lambda p: p.age > 18).all()
```

## 4) Sélection de colonnes (projections)

**Forme simple (kwargs, recommandé)**
```python
# WITH p.name AS name, p.age AS age RETURN name, age
rows = session.Person.select(name=lambda p: p.name, age=lambda p: p.age).all()
```

**Avec calculs (lambda dict)**
```python
# WITH p.name AS name, (p.price + p.tax) AS total
rows = session.Product.select(lambda p: {
    "name": p.name,
    "total": p.price + p.tax
}).all()
```

## 5) WHERE (avant WITH) et WHERE (après WITH)

**WHERE avant WITH (par défaut)**
```python
rows = session.Person \
    .where(lambda p: p.age > 18) \
    .select(name=lambda p: p.name) \
    .all()
```

**WHERE après WITH (sur alias calculé)**
```python
rows = session.Product \
    .select(total=lambda p: p.price + p.tax) \
    .where(lambda x: x.total > 100) \
    .all()
```

## 6) EXISTS (EF Any)

**Any sans prédicat**
```python
# WHERE EXISTS { MATCH (a)-[:HAS_TAG]->(t:Tag) RETURN a }
rows = session.Article.where(lambda a: a.tags.any()).all()

# WHERE NOT EXISTS
rows = session.Article.where(lambda a: not a.tags.any()).all()
```

**Any avec prédicat**
```python
# WHERE EXISTS { MATCH (a)-[:HAS_TAG]->(t:Tag) WHERE t.name = 'Tech' RETURN a }
rows = session.Article.where(lambda a: a.tags.any(lambda t: t.name == "Tech")).all()
```

## 7) Paramètres nommés

```python
rows = (session.Person
    .where(lambda p: p.age > 0)  # expr GQL peut contenir $minAge si besoin
    .params({"minAge": 25})
    .all())
```

## 8) Tri et limite

```python
rows = (session.Person
    .order_by_desc(lambda p: p.age)
    .limit(10)
    .all())
```

## 9) Compter

```python
count = session.Person.where(lambda p: p.age >= 18).count()
```

## 10) Création / sauvegarde

```python
alice = Person(name="Alice", age=30)
session.save(alice)  # crée un nœud :Person
```

## 11) Relations et profondeur

```python
# Lazy (placeholder: mapping à améliorer dans _row_to_entity())
friends = session.Person.where(lambda p: p.name == 'Alice').first().friends

# Profondeur variable (1..3)
rows = (session.Person
    .where(lambda p: p.network.any())  # MATCH (p)-[:KNOWS*1..3]->(:Person)
    .all())
```

## 12) Requêtes brutes

```python
result = session.execute_raw(
    "MATCH (p:Person) WITH p.age AS age WHERE age > 18 RETURN age",
)
# Ou scalaire
first_age = session.execute_scalar(
    "MATCH (p:Person) RETURN p.age ORDER BY p.age DESC LIMIT 1"
)
```

---

## Notes

- **Sans strings**: entités (`HasOne(City)`), relations (`via` auto), joins (`join(lambda p: p.rel)`)
- **Alias auto**: première lettre du label cible (`City` → `c`), collision gérée (`c2`, `c3`)
- **select() unifié**: kwargs simple ou lambda dict pour calculs
- **WHERE post-WITH**: `where()` après `select()` filtre sur les alias calculés
- **any(predicate)**: `any()` simple + `any(lambda t: ...)` avec filtre disponibles
- **Profondeur flexible**: `join(..., n)`, `join(..., n, m)`, `join(..., min=n)`, `join(..., max=m)`
- **Params nommés**: `.params({})` passés au moteur
- **Validation HasOne**: `session.validate_has_one_constraints()` vérifie cardinalité

## 13) Joins (navigation par relation, alias auto)

**Join 1-hop (alias auto)**
```python
# Alias auto "c" depuis City
rows = session.Person \
    .join(lambda p: p.lives_in) \
    .select(person=lambda p: p.name, city=lambda c: c.name) \
    .all()
# GQL: MATCH (p:Person)-[:LIVES_IN]->(c) RETURN person, city
```

**Join avec profondeur**
```python
# *2 hops (amis d'amis)
session.Person.join(lambda p: p.friends, 2).select(f=lambda f2: f2.name).all()

# *1..3 hops (range)
session.Person.join(lambda p: p.friends, 1, 3).select(f=lambda f2: f2.name).all()

# min-only (*2..∞)
session.Person.join(lambda p: p.network, min=2).select(f=lambda f2: f2.name).all()

# max-only (*1..3)
session.Person.join(lambda p: p.friends, max=3).select(f=lambda f2: f2.name).all()
```

**Override alias**
```python
session.Person \
    .join(lambda p: p.lives_in, alias="home") \
    .select(h=lambda home: home.name) \
    .all()
```

**Join + WHERE après WITH**
```python
rows = session.Person \
    .join(lambda p: p.lives_in) \
    .select(cityName=lambda c: c.name, pop=lambda c: c.population) \
    .where(lambda x: x.pop > 1_000_000) \
    .all()
```
