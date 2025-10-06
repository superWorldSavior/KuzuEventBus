from casys_db import Session, NodeEntity, HasMany, HasOne


class Article(NodeEntity):
    labels = ["Article"]
    tags = HasMany("Tag", via="HAS_TAG")


class Person(NodeEntity):
    labels = ["Person"]
    lives_in = HasOne("City", via="LIVES_IN")
    friends = HasMany("Person", via="KNOWS").depth(1, 2)


class City(NodeEntity):
    labels = ["City"]


class Tag(NodeEntity):
    labels = ["Tag"]


class TestORMJoinsAndAny:
    def test_join_out_person_city(self, branch):
        session = Session(branch)
        # Data
        pid = branch.add_node(["Person"], {"name": "Alice"})
        cid = branch.add_node(["City"], {"name": "Paris"})
        branch.add_edge(pid, cid, "LIVES_IN", {})

        rows = (session.Person
            .join_out("LIVES_IN", "City", "c")
            .select(person=lambda p: p.name, city=lambda c: c.name)
            .all())

        assert rows is not None
        # rows are raw rows per our current mapping; ensure at least one
        assert len(rows) >= 1

    def test_join_out_variable_length(self, branch):
        session = Session(branch)
        # Persons: A -> B -> C
        aid = branch.add_node(["Person"], {"name": "A"})
        bid = branch.add_node(["Person"], {"name": "B"})
        cid = branch.add_node(["Person"], {"name": "C"})
        branch.add_edge(aid, bid, "KNOWS", {})
        branch.add_edge(bid, cid, "KNOWS", {})

        rows = (session.Person
            .join_out("KNOWS", "Person", "f", 1, 2)
            .select(p=lambda p: p.name, f=lambda f: f.name)
            .all())

        assert rows is not None
        assert len(rows) >= 2  # A->B and A->C reachable within *1..2

    def test_any_predicate(self, branch):
        session = Session(branch)
        # Article with tags
        a1 = branch.add_node(["Article"], {"title": "Post1"})
        a2 = branch.add_node(["Article"], {"title": "Post2"})
        t1 = branch.add_node(["Tag"], {"name": "Tech"})
        t2 = branch.add_node(["Tag"], {"name": "News"})
        branch.add_edge(a1, t1, "HAS_TAG", {})
        branch.add_edge(a2, t2, "HAS_TAG", {})

        # Filter articles that have at least one Tag named 'Tech'
        # Note: select() after WHERE EXISTS not yet supported by parser
        rows = (session.Article
            .where(lambda a: a.tags.any(lambda t: t.name == "Tech"))
            .all())

        # Expect Post1 only
        assert rows is not None
        assert len(rows) == 1
