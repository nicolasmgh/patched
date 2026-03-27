import React from "react";

export default function UserAvatar({
    user,
    className = "w-8 h-8",
    textClass = "text-sm",
    fallbackBg = "bg-emerald-100",
    fallbackText = "text-emerald-700",
}) {
    if (!user || (!user.avatarUrl && !user.firstName)) return null;

    const baseClasses =
        "rounded-full flex items-center justify-center shrink-0 object-cover";
    const containerClasses = `${baseClasses} ${className}`;

    if (user.avatarUrl) {
        const url =
            user.avatarUrl.startsWith("http") ||
            user.avatarUrl.startsWith("blob:")
                ? user.avatarUrl
                : `http://localhost:3000${user.avatarUrl}`;
        return (
            <img
                src={url}
                alt={`Avatar de ${user.firstName}`}
                className={containerClasses}
            />
        );
    }

    return (
        <div
            className={`${containerClasses} ${fallbackBg} ${fallbackText} ${textClass} font-bold`}
        >
            {user.firstName ? user.firstName[0].toUpperCase() : "?"}
        </div>
    );
}
