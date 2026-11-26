from campus_safety_processor.classes import normalize_model_class, object_category


def test_normalizes_only_approved_roboflow_labels() -> None:
    assert normalize_model_class("Coffee Mug") == "mug"
    assert normalize_model_class("water_bottle") == "bottle"
    assert normalize_model_class("duffle-bag") == "duffel_bag"
    assert normalize_model_class("Cardboard Box") == "box"
    assert normalize_model_class("suspicious-looking object") is None
    assert normalize_model_class("weapon") is None


def test_assigns_conservative_object_categories() -> None:
    assert object_category("person") == "person"
    assert object_category("backpack") == "bag"
    assert object_category("mug") == "drink_container"
    assert object_category("parcel") == "package"
