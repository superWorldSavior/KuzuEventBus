"""
Tests pour NodeEntity.with_relations() - API nouvelle génération (zéro strings)

Moteur GQL mis à jour avec support complet:
✅ ID(node) - fonction pour obtenir l'identifiant interne
✅ Pattern non-orienté -[r:REL]- (Direction::Both)
✅ Pattern entrant <-[r:REL]- avec variable d'arête (Direction::Left)
✅ Union de types [:TYPE_A|TYPE_B] dans edge_type
"""
from casys_db import Session, NodeEntity, Relation


class BossRel(Relation):
    # props example
    title: str
    since: int


class KnowsRel(Relation):
    strength: float


class Person(NodeEntity):
    labels = ["Person"]
    boss = BossRel.to("Person")
    friends = KnowsRel.both("Person").depth(1, 2)
    social = None  # set in tests if needed


def _attach_session(entity: NodeEntity, session: Session) -> NodeEntity:
    setattr(entity, "_session", session)
    return entity


class TestWithRelationsPairs:
    def test_boss_pairs(self, branch):
        session = Session(branch)
        # Data: Alice -(BossRel)-> Bob
        alice = branch.add_node(["Person"], {"name": "Alice"})
        bob = branch.add_node(["Person"], {"name": "Bob"})
        branch.add_edge(alice, bob, "BossRel", {"title": "Manager", "since": 2024})

        me = _attach_session(Person(_id=alice, name="Alice"), session)

        pairs = me.with_relations(Person.boss)
        assert isinstance(pairs, list)
        assert len(pairs) == 1
        rel, node = pairs[0]
        # Relation type
        assert rel.__class__.__name__ == "BossRel"
        # Node type
        assert isinstance(node, Person)

    def test_multi_relations_boss_and_friends(self, branch):
        session = Session(branch)
        # Data: Alice -(BossRel)-> Bob; Alice -(KnowsRel)-> Charlie
        alice = branch.add_node(["Person"], {"name": "Alice"})
        bob = branch.add_node(["Person"], {"name": "Bob"})
        charlie = branch.add_node(["Person"], {"name": "Charlie"})
        branch.add_edge(alice, bob, "BossRel", {"title": "Lead"})
        branch.add_edge(alice, charlie, "KnowsRel", {"strength": 0.8})

        me = _attach_session(Person(_id=alice, name="Alice"), session)

        pairs = me.with_relations(Person.boss, Person.friends)
        # Expect two pairs with different relation classes
        classes = sorted([p[0].__class__.__name__ for p in pairs])
        assert classes == ["BossRel", "KnowsRel"]
        assert all(isinstance(p[1], Person) for p in pairs)

    def test_anyof_union_social(self, branch):
        from casys_db import AnyOf
        session = Session(branch)
        # Data: Alice -> Bob (BossRel), Alice -> Dave (KnowsRel)
        alice = branch.add_node(["Person"], {"name": "Alice"})
        bob = branch.add_node(["Person"], {"name": "Bob"})
        dave = branch.add_node(["Person"], {"name": "Dave"})
        branch.add_edge(alice, bob, "BossRel", {"title": "Head"})
        branch.add_edge(alice, dave, "KnowsRel", {"strength": 0.9})

        # Declare union on Person dynamically for the test
        Person.social = AnyOf(BossRel, KnowsRel).to("Person")

        me = _attach_session(Person(_id=alice, name="Alice"), session)
        pairs = me.with_relations(Person.social)

        rel_types = sorted([rel.__class__.__name__ for rel, _ in pairs])
        assert rel_types == ["BossRel", "KnowsRel"]
        assert all(isinstance(node, Person) for _, node in pairs)
