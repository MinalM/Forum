// Simple bcrypt implementation for MongoDB shell
var bcrypt = {
    hashSync: function(password, rounds) {
        // This is a simplified version that just adds a salt
        // In production, you should use proper bcrypt hashing
        return '$2a$' + rounds + '$' + this._hash(password);
    },
    
    _hash: function(password) {
        // Simple hashing function for demonstration
        // DO NOT use this in production!
        var hash = 0;
        for (var i = 0; i < password.length; i++) {
            var char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
};