import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext()

export function CartProvider({ children }) {
    const [cart, setCart] = useState(() => {
        try {
            const savedCart = localStorage.getItem("cart");
            return savedCart ? JSON.parse(savedCart) : []
        } catch {
            return []
        }
    })

    // Save cart whenever it changes
    useEffect(() => {
        localStorage.setItem("cart", JSON.stringify(cart))
    }, [cart])


    const getCartItemUnitPrice = (cartItem) => {
        if (cartItem.servingSize === 'half' && cartItem.item.halfPrice) {
        return cartItem.item.halfPrice
        }
        return cartItem.item.fullPrice || 0
    }


    const addItemToCart = (item) => {
        const normalizedId = String(item._id);

        setCart((previous) => {
        const existing = previous.find(
            (entry) =>
            entry.item._id === normalizedId &&
            entry.servingSize === (item.servingSize || "full")
        );

        if (existing) {
            return previous.map((entry) =>
            entry === existing
                ? { ...entry, qty: entry.qty + 1 }
                : entry
            );
        }

        return [
            ...previous,
            {
            item: {
                _id: normalizedId,
                name: item.name,
                fullPrice: item.fullPrice || item.price || 0,
                halfPrice: item.halfPrice,
                imageUrl: item.imageUrl || "",
            },
            servingSize: item.servingSize || "full",
            qty: 1,
            },
        ];
        });
    };


    const removeItemFromCart = (itemId, servingSize = "full") => {
        const normalizedId = String(itemId);

        setCart((previous) =>
        previous.filter(
            (entry) =>
            !(
                entry.item._id === normalizedId &&
                entry.servingSize === servingSize
            )
        )
        );
    };

    const updateCartItemQty = (itemId, delta, servingSize = 'full') => {
        const normalizedId = String(itemId)

        setCart((previous) => {
        const existing = previous.find(
            (entry) => entry.item._id === normalizedId && entry.servingSize === servingSize,
        )

        if (!existing) return previous

        const nextQty = existing.qty + delta
        if (nextQty <= 0) {
            return previous.filter((entry) => entry !== existing)
        }

        return previous.map((entry) => (entry === existing ? { ...entry, qty: nextQty } : entry))
        })
    }

    const clearCart = () => {
        setCart([]);
    };


    const checkoutDisabled = cart.length === 0
    const PACKAGING_FEE = 0

    const cartCount = cart.reduce((sum, entry) => sum + entry.qty, 0)
    const subtotal = cart.reduce((sum, entry) => sum + getCartItemUnitPrice(entry) * entry.qty, 0)
    const packaging = cart.length > 0 ? PACKAGING_FEE : 0

    const cartTotals = {
        subtotal,
        packaging,
        total: subtotal + packaging,
    }

    return (
        <CartContext.Provider
            value={{
                cart,   
                addItemToCart,
                removeItemFromCart,
                updateCartItemQty,
                cartCount,
                cartTotals,
                getCartItemUnitPrice,
                checkoutDisabled,
                clearCart
            }}
        >
            { children }
        </CartContext.Provider>
    )
}

export function useCart() {
    return useContext(CartContext);
}