CREATE TABLE users (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT NOT NULL,
    email                 TEXT NOT NULL,
    password_hash         TEXT NOT NULL,
    appearance            TEXT NOT NULL DEFAULT 'system'
                          CHECK (appearance IN ('system', 'light', 'dark')),
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    preferred_currency    TEXT NOT NULL DEFAULT 'NGN'
                          CHECK (preferred_currency IN ('NGN', 'USD', 'GBP', 'EUR')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX categories_user_name_key ON categories (user_id, lower(name));

CREATE TABLE subcategories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subcategories_id_category_key UNIQUE (id, category_id)
);
CREATE UNIQUE INDEX subcategories_category_name_key ON subcategories (category_id, lower(name));

CREATE TABLE expenditures (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    spent_on       DATE NOT NULL,
    category_id    UUID NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    subcategory_id UUID NOT NULL,
    amount         NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency       TEXT NOT NULL CHECK (currency IN ('NGN', 'USD', 'GBP', 'EUR')),
    payment_method TEXT NOT NULL
                   CHECK (payment_method IN ('Bank Transfer', 'Cash', 'Card', 'Mobile Money', 'Other')),
    vendor         TEXT NOT NULL DEFAULT '',
    reference      TEXT NOT NULL DEFAULT '',
    description    TEXT NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- the sub-category must belong to the chosen category
    CONSTRAINT expenditures_subcategory_fk FOREIGN KEY (subcategory_id, category_id)
        REFERENCES subcategories (id, category_id) ON DELETE RESTRICT
);
CREATE INDEX expenditures_user_date_idx ON expenditures (user_id, spent_on DESC);
CREATE INDEX expenditures_user_category_idx ON expenditures (user_id, category_id);
