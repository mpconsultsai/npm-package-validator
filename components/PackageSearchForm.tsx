interface PackageSearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PackageSearchForm({
  value,
  onChange,
  onSubmit,
  loading = false,
  disabled = false,
}: PackageSearchFormProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-8">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="packageName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Package Name
          </label>
          <input
            type="text"
            id="packageName"
            name="packageName"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g., react, lodash, @graphql-inspector/core"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            disabled={disabled || loading}
          />
        </div>
        <button
          type="submit"
          disabled={disabled || loading || !value.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? "Analysing..." : "Analyse Package"}
        </button>
      </form>
    </div>
  );
}
